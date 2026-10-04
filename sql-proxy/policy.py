"""Política PostgreSQL basada en su árbol sintáctico, no en texto de parámetros."""
import json
from pglast.parser import parse_sql_json

ALLOWED = {'SelectStmt', 'InsertStmt', 'UpdateStmt', 'DeleteStmt',
           'TransactionStmt', 'VariableSetStmt', 'VariableShowStmt',
           'ExplainStmt', 'DiscardStmt', 'DeallocateStmt'}
DANGEROUS_FUNCTIONS = {
    'pg_sleep', 'pg_sleep_for', 'pg_sleep_until', 'pg_read_file',
    'pg_read_binary_file', 'pg_ls_dir', 'lo_import', 'lo_export',
    'dblink', 'dblink_exec', 'pg_terminate_backend', 'pg_cancel_backend',
    'set_config', 'query_to_xml', 'database_to_xml', 'schema_to_xml',
}

def walk(value):
    if isinstance(value, dict):
        for key, child in value.items():
            yield key, child
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)

def constant(node):
    if not isinstance(node, dict): return None
    value = node.get('A_Const')
    if value:
        for kind, field in [('ival', 'ival'), ('fval', 'fval'), ('sval', 'sval'), ('boolval', 'boolval')]:
            if kind in value: return value[kind].get(field, False if kind == 'boolval' else 0)
    if 'TypeCast' in node: return constant(node['TypeCast'].get('arg'))
    if 'BoolExpr' in node:
        expression = node['BoolExpr']
        values = [constant(arg) for arg in expression.get('args', [])]
        op = expression.get('boolop')
        if op == 'OR_EXPR' and True in values: return True
        if op == 'AND_EXPR' and values and all(v is True for v in values): return True
        if op == 'NOT_EXPR' and len(values) == 1 and isinstance(values[0], bool): return not values[0]
    if 'A_Expr' in node:
        expression = node['A_Expr']
        left, right = constant(expression.get('lexpr')), constant(expression.get('rexpr'))
        names = expression.get('name', [])
        operator = names[0].get('String', {}).get('sval') if names else ''
        if left is not None and right is not None and type(left) is type(right):
            if operator == '=': return left == right
            if operator in ('<>', '!='): return left != right
            if operator == '>': return left > right
            if operator == '<': return left < right
            if operator == '>=': return left >= right
            if operator == '<=': return left <= right
    return None

def inspect_sql(sql):
    if len(sql.encode('utf-8')) > 65536: return 'CONSULTA_DEMASIADO_GRANDE'
    try:
        statements = json.loads(parse_sql_json(sql)).get('stmts', [])
    except Exception:
        return 'SQL_INVALIDO'
    # BEGIN/COMMIT + SELECT es frecuente en clientes; cada sentencia se inspecciona.
    for raw in statements:
        statement = raw.get('stmt', {})
        root = next(iter(statement), '')
        if root not in ALLOWED: return 'OPERACION_NO_PERMITIDA'
        if root in ('DeleteStmt', 'UpdateStmt') and not statement[root].get('whereClause'):
            return 'ESCRITURA_SIN_FILTRO'
        if root in ('InsertStmt', 'DeleteStmt', 'UpdateStmt'):
            relation = statement[root].get('relation', {})
            if relation.get('schemaname', '') in ('pg_catalog', 'information_schema') or relation.get('relname', '').startswith('pg_'):
                return 'ESCRITURA_CATALOGO_NO_PERMITIDA'
        for key, value in walk(statement):
            if key in ('InsertStmt', 'DeleteStmt', 'UpdateStmt'):
                if key != 'InsertStmt' and not value.get('whereClause'): return 'ESCRITURA_SIN_FILTRO'
                relation = value.get('relation', {})
                if relation.get('schemaname', '') in ('pg_catalog', 'information_schema') or relation.get('relname', '').startswith('pg_'):
                    return 'ESCRITURA_CATALOGO_NO_PERMITIDA'
            if key == 'SelectStmt':
                if value.get('intoClause'): return 'CREACION_NO_PERMITIDA'
                if value.get('op') == 'SETOP_UNION': return 'UNION_NO_PERMITIDO'
            if key == 'BoolExpr' and value.get('boolop') == 'OR_EXPR':
                if any(constant(arg) is True for arg in value.get('args', [])):
                    return 'TAUTOLOGIA_OR'
            if key == 'FuncCall':
                names = [part.get('String', {}).get('sval', '').lower() for part in value.get('funcname', [])]
                if names and names[-1] in DANGEROUS_FUNCTIONS: return 'FUNCION_PELIGROSA'
            if key == 'VariableSetStmt':
                name = value.get('name', '').lower()
                args = value.get('args', [])
                setting = constant(args[0]) if len(args) == 1 else None
                setting = str(setting).upper().replace('-', '') if setting is not None else ''
                # libpq/HeidiSQL repite UTF8 al iniciar. Es el mismo modo del parser.
                if name == 'client_encoding' and setting in ('UTF8', 'UNICODE'):
                    continue
                if name == 'standard_conforming_strings' and setting in ('ON', 'TRUE', '1'):
                    continue
                if name in ('client_encoding', 'standard_conforming_strings', 'backslash_quote', 'role', 'session_authorization'):
                    return 'CAMBIO_SEGURIDAD_NO_PERMITIDO'
    return None
