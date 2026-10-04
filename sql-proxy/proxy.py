"""Proxy del protocolo PostgreSQL v3. Autenticación relayed sin guardar contraseñas."""
import asyncio
import json
import os
import struct
import time
import uuid
import ssl
from datetime import datetime, timezone
from pathlib import Path
from policy import inspect_sql

UPSTREAM = os.environ.get('UPSTREAM_HOST', 'internal-db')
UPSTREAM_PORT = int(os.environ.get('UPSTREAM_PORT', '5432'))
PORT = int(os.environ.get('LISTEN_PORT', '5432'))
EVENTS = Path(os.environ.get('EVENTS_DIR', '/events'))
MAX_PACKET = 4 * 1024 * 1024
MAX_CLIENTS = 100
CLIENTS = 0
ROUTES = {}
ROUTE_CLIENTS = {}

def packet(kind, payload):
    return kind + struct.pack('!I', len(payload) + 4) + payload

def error(reason):
    message = 'DB-Shield bloqueó la consulta. Regla: ' + reason
    return packet(b'E', b'SERROR\0VERROR\0C42501\0M' + message.encode() + b'\0\0')

async def frame(reader):
    kind = await reader.readexactly(1)
    length = struct.unpack('!I', await reader.readexactly(4))[0]
    if length < 4 or length > MAX_PACKET: raise ValueError('tamaño inválido')
    return kind, await reader.readexactly(length - 4)

def record(database, username, peer, reason, route=None):
    # Nunca persistir consultas, parámetros, tokens o contraseñas.
    path = EVENTS / 'blocked.jsonl'
    if path.exists() and path.stat().st_size > 5 * 1024 * 1024:
        path.replace(EVENTS / 'blocked.previous.jsonl')
    event = dict(id=str(uuid.uuid4()), database=database, username=username,
                 origin=peer, rule=reason, timestamp=datetime.now(timezone.utc).isoformat())
    if route: event['connectionId'] = route['id']
    with path.open('a', encoding='utf-8') as output:
        output.write(json.dumps(event, ensure_ascii=True) + '\n')

async def serve(reader, writer, route=None, tls=None):
    global CLIENTS
    if CLIENTS >= MAX_CLIENTS:
        writer.close(); return
    CLIENTS += 1
    if route: ROUTE_CLIENTS.setdefault(route['id'], set()).add(writer)
    upstream_writer = None
    relay_task = None
    database = username = ''
    peer = str(writer.get_extra_info('peername', ('unknown',))[0])
    authenticated = False
    pending = None
    response = asyncio.Event()
    extended_failed = False
    response_error = False
    reason = None
    try:
        # TLS externo se proporciona mediante túnel SSH; no abrir este listener a Internet.
        while True:
            length = struct.unpack('!I', await asyncio.wait_for(reader.readexactly(4), 15))[0]
            if length < 8 or length > 65536: raise ValueError('inicio inválido')
            startup = await asyncio.wait_for(reader.readexactly(length - 4), 15)
            code = struct.unpack('!I', startup[:4])[0]
            if code in (80877103, 80877104):
                writer.write(b'N'); await writer.drain(); continue
            # CancelRequest no se reenvía: impedir cancelar sesiones fuera del proxy.
            if code != 196608: raise ValueError('protocolo no admitido')
            parts = startup[4:].rstrip(b'\0').split(b'\0')
            params = dict(zip(parts[::2], parts[1::2]))
            username = params.get(b'user', b'').decode('utf-8')
            database = params.get(b'database', params.get(b'user', b'')).decode('utf-8')
            encoding = params.get(b'client_encoding', b'UTF8').upper().replace(b'-', b'')
            if encoding not in (b'UTF8', b'UNICODE') or params.get(b'options') or params.get(b'replication'):
                writer.write(error('INICIO_NO_PERMITIDO')); await writer.drain(); return
            break
        if route and (database != route['database'] or username != route['user']):
            writer.write(error('USUARIO_O_BASE_NO_CORRESPONDE')); await writer.drain(); return
        target = route['targetHost'] if route else UPSTREAM
        target_port = route['targetPort'] if route else UPSTREAM_PORT
        upstream_reader, upstream_writer = await asyncio.wait_for(asyncio.open_connection(target, target_port), 5)
        if route:
            upstream_writer.write(struct.pack('!II', 8, 80877103)); await upstream_writer.drain()
            if await asyncio.wait_for(upstream_reader.readexactly(1), 5) != b'S':
                writer.write(error('PROVEEDOR_NO_ADMITE_SSL')); await writer.drain(); return
            await upstream_writer.start_tls(tls, server_hostname=target, ssl_handshake_timeout=10)
        upstream_writer.write(struct.pack('!I', length) + startup)
        await upstream_writer.drain()

        async def relay_backend():
            nonlocal authenticated, pending, response_error
            try:
                while True:
                    kind, payload = await frame(upstream_reader)
                    if kind == b'R' and payload[:4] == b'\0\0\0\0': authenticated = True
                    if route and kind == b'R' and payload[:4] == struct.pack('!I', 10):
                        # El cliente llega por SSH sin TLS PostgreSQL local. El binding
                        # TLS del proveedor no existe en ese lado: anunciar solo SCRAM
                        # compatible, manteniendo la autenticación real del proveedor.
                        mechanisms = [name for name in payload[4:].split(b'\0') if name and name != b'SCRAM-SHA-256-PLUS']
                        if not mechanisms: raise ValueError('autenticación requiere binding TLS extremo a extremo')
                        payload = struct.pack('!I', 10) + b'\0'.join(mechanisms) + b'\0\0'
                    if kind == b'E':
                        response_error = True
                        if reason: payload = error(reason)[5:]
                    writer.write(packet(kind, payload)); await writer.drain()
                    if (pending == b'Q' and kind == b'Z') or (pending == b'P' and kind in (b'1', b'E')) or (pending == b'S' and kind == b'Z'):
                        pending = None; response.set()
            finally:
                response.set()
                writer.close()

        relay_task = asyncio.create_task(relay_backend())
        while True:
            kind, payload = await frame(reader)
            if kind == b'X':
                upstream_writer.write(packet(kind, payload)); await upstream_writer.drain(); break
            if not authenticated:
                if kind != b'p': raise ValueError('mensaje antes de autenticación')
            elif extended_failed and kind != b'S':
                continue
            elif kind not in (b'Q', b'P', b'B', b'D', b'E', b'C', b'S', b'H'):
                writer.write(error('PROTOCOLO_NO_PERMITIDO')); await writer.drain(); break
            if authenticated and kind in (b'Q', b'P'):
                reason = None
                if kind == b'Q':
                    if not payload.endswith(b'\0'): raise ValueError('consulta inválida')
                    sql = payload[:-1].decode('utf-8')
                else:
                    name, sql_bytes, types = payload.split(b'\0', 2)
                    sql = sql_bytes.decode('utf-8')
                reason = inspect_sql(sql)
                if reason:
                    # Una sentencia inválida asegura ErrorResponse, ReadyForQuery y aborto
                    # de transacción reales. Ningún byte de SQL rechazado llega a PostgreSQL.
                    replacement = b'DBSHIELD BLOCKED POLICY'
                    payload = replacement + b'\0' if kind == b'Q' else name + b'\0' + replacement + b'\0' + types
                    record(database, username, peer, reason, route)
                response.clear(); response_error = False; pending = kind
                upstream_writer.write(packet(kind, payload))
                # ParseComplete puede quedar en el búfer del servidor hasta Flush.
                if kind == b'P': upstream_writer.write(packet(b'H', b''))
                await upstream_writer.drain()
                await response.wait()
                if relay_task.done(): break
                if kind == b'P': extended_failed = response_error
                reason = None
                continue
            if authenticated and kind == b'S':
                response.clear(); pending = kind
                upstream_writer.write(packet(kind, payload)); await upstream_writer.drain()
                await response.wait()
                if relay_task.done(): break
                extended_failed = False; reason = None
                continue
            upstream_writer.write(packet(kind, payload)); await upstream_writer.drain()
    except ssl.SSLError:
        writer.write(error('CERTIFICADO_SSL_PROVEEDOR_NO_VERIFICADO'))
        try: await writer.drain()
        except ConnectionError: pass
    except (asyncio.IncompleteReadError, ConnectionError, OSError, ValueError, asyncio.TimeoutError):
        pass
    finally:
        if route: ROUTE_CLIENTS.get(route['id'], set()).discard(writer)
        if relay_task:
            relay_task.cancel()
            await asyncio.gather(relay_task, return_exceptions=True)
        if upstream_writer: upstream_writer.close()
        writer.close()
        CLIENTS -= 1

async def heartbeat():
    while True:
        temp = EVENTS / 'status.tmp'
        routes = {str(key): dict(listenPort=value['config']['listenPort'], revision=value['config']['revision']) for key, value in ROUTES.items()}
        temp.write_text(json.dumps(dict(timestamp=time.time(), upstream=UPSTREAM, port=PORT, routes=routes)), encoding='utf-8')
        temp.replace(EVENTS / 'status.json')
        await asyncio.sleep(10)

async def reconcile_routes():
    path = EVENTS / 'routes.json'
    while True:
        try:
            configs = json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
            if not isinstance(configs, list) or len(configs) > 32: raise ValueError('registro inválido')
            requested = {int(item['id']): item for item in configs}
        except (OSError, ValueError, KeyError, TypeError): requested = {}
        for key in list(ROUTES):
            if key not in requested or requested[key] != ROUTES[key]['config']:
                ROUTES.pop(key)['server'].close()
                for connection in list(ROUTE_CLIENTS.get(key, set())): connection.close()
        for key, config in requested.items():
            if key in ROUTES: continue
            try:
                if not 15432 <= int(config['listenPort']) <= 15463: raise ValueError('puerto inválido')
                if not 1 <= int(config['targetPort']) <= 65535: raise ValueError('destino inválido')
                context = ssl.create_default_context()
                if config.get('sslCaPem'):
                    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
                    context.load_verify_locations(cadata=config['sslCaPem'])
                context.check_hostname = True; context.verify_mode = ssl.CERT_REQUIRED
                callback = lambda r, w, cfg=config, ctx=context: serve(r, w, cfg, ctx)
                server = await asyncio.start_server(callback, '0.0.0.0', int(config['listenPort']), limit=MAX_PACKET)
                ROUTES[key] = dict(config=config, server=server)
            except (OSError, ValueError, KeyError, TypeError):
                # Configuración inválida: no publicar este listener ni declarar protección.
                continue
        await asyncio.sleep(2)

async def main():
    EVENTS.mkdir(parents=True, exist_ok=True)
    server = await asyncio.start_server(serve, '0.0.0.0', PORT, limit=MAX_PACKET)
    asyncio.create_task(heartbeat())
    asyncio.create_task(reconcile_routes())
    print('DB-Shield PostgreSQL proxy iniciado; política activa.', flush=True)
    async with server: await server.serve_forever()

if __name__ == '__main__': asyncio.run(main())
