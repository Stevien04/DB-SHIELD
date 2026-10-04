import os, subprocess, sys, json, time
from pathlib import Path
import psycopg
ca = Path('/tls/ca.pem').read_text()
routes = [dict(id=1, listenPort=15432, targetHost='ssl-db', targetPort=5432, database='ssltest', user='ssltest', sslCaPem=ca, revision='valid'),
          dict(id=2, listenPort=15433, targetHost='wrong-ssl-host', targetPort=5432, database='ssltest', user='ssltest', sslCaPem=ca, revision='wrong-host'),
          dict(id=3, listenPort=15434, targetHost='ssl-db', targetPort=5432, database='ssltest', user='ssltest', sslCaPem=Path('/tls/other.pem').read_text(), revision='wrong-ca')]
Path('/events/routes.json').write_text(json.dumps(routes))
process = subprocess.Popen([sys.executable, '-u', 'proxy.py'])
try:
    for attempt in range(80):
        try:
            client = psycopg.connect(host='127.0.0.1',port=15432,user='ssltest',password='test-only-password',dbname='ssltest',sslmode='disable',connect_timeout=1,autocommit=True)
            break
        except psycopg.Error as failure:
            last_error = str(failure); time.sleep(0.1)
    else: raise AssertionError('Listener externo no disponible: ' + last_error)
    assert client.execute('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()').fetchone()[0] is True
    try: client.execute('SELECT 1 WHERE 0=1 OR 1=1')
    except psycopg.Error as error: assert error.sqlstate=='42501'
    else: raise AssertionError('Ataque no bloqueado')
    client.close()
    for port in (15433,15434):
        try: psycopg.connect(host='127.0.0.1',port=port,user='ssltest',password='test-only-password',dbname='ssltest',sslmode='disable',connect_timeout=2)
        except psycopg.Error: pass
        else: raise AssertionError('Se aceptó SSL sin verificar CA y hostname')
    environment=dict(os.environ,TEST_USER='ssltest',TEST_PASSWORD='test-only-password',TEST_DB='ssltest',TEST_DIRECT_HOST='ssl-db',TEST_PROXY_HOST='127.0.0.1',TEST_PROXY_PORT='15432')
    subprocess.run([sys.executable,'test_integration.py'],env=environment,check=True,timeout=30)
    events=[json.loads(line) for line in Path('/events/blocked.jsonl').read_text().splitlines()]
    assert events and all(event.get('connectionId')==1 for event in events)
    assert all(not any(key in event for key in ('query','password','sslCaPem')) for event in events)
    Path('/events/routes.json').write_text('[]')
    time.sleep(2.5)
    try: psycopg.connect(host='127.0.0.1',port=15432,user='ssltest',password='test-only-password',dbname='ssltest',sslmode='disable',connect_timeout=2)
    except psycopg.Error: pass
    else: raise AssertionError('Se mantuvo un listener revocado')
    print('Proxy externo: TLS verificado, autenticación real, bloqueos aislados y revocación comprobados.')
finally:
    process.terminate(); process.wait(timeout=5)
