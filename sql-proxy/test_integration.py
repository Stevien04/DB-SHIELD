"""Ensayo del protocolo real: fixture aislada; ningún dato existente se modifica."""
import os
import uuid
import psycopg

config = dict(user=os.environ['TEST_USER'], password=os.environ['TEST_PASSWORD'], dbname=os.environ.get('TEST_DB', 'dbshield'), sslmode='disable', connect_timeout=5)
table = 'proxy_test_' + uuid.uuid4().hex
direct = psycopg.connect(host=os.environ.get('TEST_DIRECT_HOST', 'internal-db'), port=5432, autocommit=True, **config)
proxy_port = int(os.environ.get('TEST_PROXY_PORT', '5432'))
proxy = psycopg.connect(host=os.environ.get('TEST_PROXY_HOST', 'sql-proxy'), port=proxy_port, autocommit=True, **config)
try:
    with psycopg.ClientCursor(proxy) as cursor:
        cursor.execute("SET client_encoding TO 'UTF8'; SET standard_conforming_strings TO on;")
        cursor.execute("SHOW client_encoding")
        assert cursor.fetchone()[0] == 'UTF8'
    print('Inicialización UTF8 de HeidiSQL/libpq permitida.', flush=True)
    direct.execute(f'CREATE TABLE {table} (id int PRIMARY KEY, nombre text, stock int)')
    # Parámetros separados: un texto malicioso es un dato, nunca una sentencia.
    text = "' OR 1=1; DROP TABLE pedidos --"
    proxy.execute(f'INSERT INTO {table} VALUES (%s, %s, %s)', (1, text, 5), prepare=True)
    proxy.execute(f'UPDATE {table} SET stock=stock-1 WHERE id=%s', (1,), prepare=True)
    assert proxy.execute(f'SELECT nombre, stock FROM {table} WHERE id=%s', (1,), prepare=True).fetchone() == (text, 4)
    print('INSERT, UPDATE y parámetros preparados legítimos funcionan.', flush=True)
    attacks = [f'SELECT * FROM {table} WHERE id=0 OR 1=1', f'SELECT * FROM {table} WHERE id=0 OR \'a\'=\'a\'',
               f'SELECT * FROM {table} WHERE id=0 OR/**/true', f'SELECT * FROM {table}; DROP TABLE {table}',
               f'DELETE FROM {table}', "SELECT pg_read_file('/etc/passwd')", "SELECT pg_sleep(1)"]
    for prepare in (False, True):
        for sql in attacks:
            try:
                # Simple protocol utiliza ClientCursor; extended usa Parse/Bind.
                if prepare:
                    proxy.execute(sql, prepare=True)
                else:
                    with psycopg.ClientCursor(proxy) as cursor: cursor.execute(sql)
            except psycopg.Error as error:
                assert error.sqlstate == '42501', (sql, error.sqlstate)
                assert 'DB-Shield' in str(error)
            else: raise AssertionError('Ataque no bloqueado: ' + sql)
            assert proxy.execute('SELECT current_database()').fetchone()[0] == config['dbname']
    assert direct.execute(f'SELECT count(*), min(stock) FROM {table}').fetchone() == (1, 4)
    print('Ataques bloqueados en protocolos simple y preparado; sesión recuperable y tabla intacta.', flush=True)
    with proxy.transaction():
        proxy.execute(f'UPDATE {table} SET stock=3 WHERE id=1')
    try:
        with proxy.transaction():
            proxy.execute(f'UPDATE {table} SET stock=2 WHERE id=1')
            proxy.execute(f'SELECT * FROM {table} WHERE id=0 OR 1=1')
    except psycopg.Error as error: assert error.sqlstate == '42501'
    assert direct.execute(f'SELECT stock FROM {table}').fetchone()[0] == 3
    proxy.execute(f'DELETE FROM {table} WHERE id=%s', (1,))
    print('Transacciones y rollback tras bloqueo verificados; DELETE con filtro permitido.', flush=True)
    try:
        psycopg.connect(host=os.environ.get('TEST_PROXY_HOST', 'sql-proxy'), port=proxy_port, **{**config, 'password':'invalid-password'})
    except psycopg.Error: print('Contraseña incorrecta rechazada por PostgreSQL.', flush=True)
    else: raise AssertionError('Autenticación omitida')
finally:
    proxy.close()
    direct.execute(f'DROP TABLE IF EXISTS {table}')
    direct.close()
