# DB-Shield en el VPS

Publicado el 3 de octubre de 2026 en http://31.220.88.80/login.

## Instalación

Directorio activo: `/opt/dbshield/releases/20261003-current`.
Proyecto Compose: `dbshield`.
Servicios: `frontend`, `backend`, `internal-db`.
Frontend público: puerto 80.
Backend: puerto 8080 ligado únicamente a 127.0.0.1.
PostgreSQL no publica un puerto del host; conserva el volumen `dbshield_internal-db-data`. El proxy SQL publica `127.0.0.1:5432` para el túnel SSH.
La configuración y las credenciales de ejecución están en `.env` del directorio activo con permisos 600.
El backend se ejecuta con `backend-live.jar` compilado localmente, montado sobre la imagen base exportada. El frontend actualizado se monta desde `frontend-live`.

## Operación

Ejecutar en el VPS desde el directorio activo:

```sh
docker compose -f compose.yml ps
docker compose -f compose.yml logs --tail=100 backend
docker compose -f compose.yml restart backend frontend
```

No ejecutar operaciones globales de Docker ni comandos sobre otros proyectos.
Si se recrea el contenedor backend y cambia su IP interna, recargar Nginx con `docker compose -f compose.yml exec -T frontend nginx -s reload`.

## Conservación y validación

Respaldo físico previo de PostgreSQL: `/opt/dbshield/backups/postgres-before-20261003.tar.gz` (realizado cuando la base no tenía contenedores en ejecución).
Se conservaron los tres usuarios existentes y las migraciones V1, V2 y V3.
No se modificaron ni reiniciaron `app-backend-1`, `app-frontend-1`, `nannyapp` ni `sonarqube`. Se compararon sus IDs y fechas de inicio antes y después.
Se verificaron HTTP 200 de la página y sus recursos, inicio de sesión administrativo, acceso autorizado a usuarios y auditoría, HTTP 401 sin sesión o con token inválido y HTTP 404 de la ruta pública de reparación de contraseñas.
Pasaron las pruebas GoogleAuthControllerTest y JwtRequestFilterTest.

## Límites actuales

## Organización en español

En HeidiSQL, actualizar la conexión y abrir el esquema `sistema`. Contiene seis tablas: `usuarios`, `perfiles_usuarios`, `roles`, `vinculaciones_google`, `suspensiones_usuarios` y `registros_auditoria`.
Son tablas de consulta sincronizadas automáticamente mediante triggers desde las tablas originales de `public`. El backend conserva esas tablas originales como fuente de escritura; los cambios deben hacerse desde la aplicación. Las contraseñas no se duplican en el esquema de consulta.
El script local `esquema_sistema_espanol.sql` es específico de PostgreSQL y se instala con `psql --single-transaction`. No es una migración Flyway ni cambia los mapeos JPA.
Respaldo lógico previo: `/opt/dbshield/backups/antes-esquema-espanol.sql`.
Se verificaron la copia de usuarios y auditoría, la sincronización de cambios y el inicio de sesión administrativo. El ensayo temporal se revirtió antes de aplicar la instalación definitiva.

## Límites de acceso y persistencia

Google está configurado con el Client ID, pero Google Identity Services necesita un dominio HTTPS autorizado para funcionar públicamente; el acceso HTTP por IP usa usuario y contraseña.
Los registros almacenados por el frontend en localStorage pertenecen al navegador y al origen: los datos de localhost no se transfieren automáticamente al origen del VPS.
Las métricas generales del dashboard y el LOCKDOWN de la interfaz conservan su comportamiento actual.

## Monitor de consultas reales

La migración V4 agrega `sistema.conexiones_bases_datos`. Las conexiones se guardan en el servidor con contraseña cifrada y se restringen por propietario o administrador. Las antiguas conexiones del navegador deben registrarse nuevamente; sus contraseñas no se transfieren automáticamente.

DAM consulta la base seleccionada cada dos segundos mediante JDBC: `pg_stat_activity` para PostgreSQL y `information_schema.processlist` para MySQL. Muestra únicamente sesiones activas visibles para el usuario de conexión. Las consultas muy rápidas pueden terminar entre sondeos. Una base sin sesiones activas muestra una lista vacía. Los errores de conexión se muestran y detienen la consulta.

El ejecutor manual admite una sola consulta SELECT en una transacción de solo lectura, con límite de 50 filas y 10 segundos. No admite escrituras.

Pasaron GoogleAuthControllerTest, JwtRequestFilterTest y RealMonitorTest. En local y en el VPS se verificaron dos bases distintas, su aislamiento, resultados de `current_database()`, aparición y desaparición de sesiones reales y rechazo de escrituras.
Respaldo lógico previo: `/opt/dbshield/backups/antes-monitor-real.sql`. Configuración anterior: `compose.antes-monitor-real.yml`.

## Proxy de protección PostgreSQL

Servicio `sql-proxy`, imagen `dbshield-sql-proxy:20261003`, volumen `dbshield_proxy-events`.
El túnel SSH a 127.0.0.1:5432 ahora llega al proxy. Reconectar HeidiSQL tras el despliegue.
Las conexiones de DAM al PostgreSQL del VPS se redirigen a `sql-proxy:5432`; la base administrativa mantiene su canal interno de migraciones.
Se verificó en el VPS el bloqueo 42501 sobre el puerto del túnel y la respuesta 406 del ejecutor ante un ataque rechazado por el proxy.
El panel DAM consulta registros reales y el latido del proxy; no declara protegidas bases externas sin este proxy.
Política, límites e instrucciones para conectar una tienda externa en `sql-proxy/README.md`.
Respaldo lógico: `/opt/dbshield/backups/antes-proxy-sql.sql`. Configuración y JAR previos: `compose.antes-proxy-sql.yml` y `backend.antes-proxy-sql.jar`.
Las cuatro aplicaciones ajenas conservaron exactamente sus IDs y fechas de arranque.

## Importación SSL de conexiones PostgreSQL

El formulario de Bases de Datos permite activar SSL e importar CA PEM (.pem/.crt), máximo 256 KB. No acepta claves privadas ni certificados de cliente.
V5 agrega `ssl_habilitado`, `certificado_ca_pem` y `certificado_ca_nombre` a `sistema.conexiones_bases_datos`; las conexiones existentes conservan su configuración sin SSL.
JDBC usa verify-full con un almacén de confianza propio de cada conexión. Sin CA importada usa las autoridades públicas del JVM. No cambia la confianza global ni desactiva validación de nombre del servidor.
La CA se guarda en el servidor y se conserva al editar sin reemplazarla. La API devuelve solo nombre y presencia del certificado, nunca el PEM ni la contraseña.
Se probaron registro y edición con PostgreSQL TLS real, CA incorrecta, dominio incorrecto, servidor sin SSL y certificados inválidos. Pasaron las regresiones de monitor, proxy y autenticación.
Esta opción establece SSL para registrar, consultar y monitorear bases externas PostgreSQL. Para inspeccionar sus conexiones se habilita la ruta de proxy descrita a continuación.
Respaldo previo: `/opt/dbshield/backups/antes-registro-ssl.sql` y `backend.antes-registro-ssl.jar`.

## Proxy por conexión externa PostgreSQL

V6 agrega `puerto_proxy` único a las conexiones. DAM permite habilitar el proxy para una base PostgreSQL con SSL; verifica primero su conexión original y asigna un puerto entre 15432 y 15463. El registro compartido `routes.json` contiene destino, base, usuario y CA pública, sin contraseña. El proxy confirma la revisión de la ruta mediante su latido, y verifica TLS y hostname hacia el proveedor.

Compose publica estos puertos exclusivamente en 127.0.0.1 del VPS. HeidiSQL o una aplicación externa deben usar el túnel SSH indicado por DAM, con las credenciales originales de la base. Para este túnel local se desactiva SSL PostgreSQL en el cliente; el proxy verifica SSL hacia Aiven/Neon. El ejecutor y monitor DAM usan el puerto asignado. Las conexiones directas al proveedor no pasan por la inspección.

Los registros se aíslan por ID de conexión. Desactivar la base o SSL elimina su ruta y sesiones; cambiar destino o CA fuerza una nueva conexión. Las pruebas incluyen certificados incorrectos, SCRAM, consultas y transacciones legítimas, bloqueos y revocación. Pasaron 21 pruebas Java de autenticación, monitor, SSL y rutas.

Respaldo anterior: `/opt/dbshield/backups/antes-proxy-externo.sql`, `backend.antes-proxy-externo.jar` y `compose.antes-proxy-externo.yml`.

Se verificó la conexión Aiven existente (ID 4, `defaultdb`) por `sql-proxy:15432`: consulta real con usuario `avnadmin`, ataque SELECT inocuo rechazado y registro `TAUTOLOGIA_OR` asociado a esta conexión. El monitor en vivo sondea esa base sin errores. Las seis migraciones quedaron aplicadas y backend/proxy saludables. Los cuatro contenedores ajenos conservaron IDs y fechas de arranque. Evidencia local: `proxy-aiven-activo.png`.

## API HTTPS y HTTP de integración

Panel `/integration`, endpoint POST `/api/v1/integration/query`. HTTPS público válido para 31.220.88.80 mediante Let's Encrypt y Certbot 5.4; renovación automática cada 12 horas mediante `dbshield-cert-renew.timer`, con ensayo de renovación satisfactorio. Certificados en `/opt/dbshield/tls`. Nginx publica 80 y 443; el backend conserva 8080 solo en loopback. HTTP disponible únicamente recomendado para pruebas.

V7 crea claves API por propietario y conexión. Claves aleatorias, huella SHA-256 almacenada, expiración de 30 días y revocación; el valor se muestra solo al crear. La API admite SELECT e INSERT/UPDATE/DELETE con permiso explícito, parámetros JDBC separados y una transacción por solicitud. Exige protección de proxy activa y nunca recurre a una conexión directa. Límite PostgreSQL de ejecución de 10 segundos, 100 filas y respuesta limitada; Nginx controla frecuencia y tamaño de peticiones.

Pasaron 23 pruebas Java y pruebas reales de HTTP/HTTPS con Aiven: consulta parametrizada, SQL peligroso usado como dato, ataque bloqueado 406/42501, clave inválida/revocada, aislamiento entre conexiones y escritura autorizada sobre cero filas. Claves de prueba revocadas. Documentación y ejemplos en `API_INTEGRATION.md`.

Respaldo anterior: `/opt/dbshield/backups/antes-api-integracion.sql`, `backend.antes-api-integracion.jar`, `compose.antes-api-integracion.yml` y `nginx.antes-api-integracion.conf`.

## API HTTPS y HTTP de integración

Panel `/integration`, endpoint POST `/api/v1/integration/query`. HTTPS público válido para 31.220.88.80 mediante Let's Encrypt y Certbot 5.4; renovación automática cada 12 horas mediante `dbshield-cert-renew.timer`, con ensayo de renovación satisfactorio. Certificados en `/opt/dbshield/tls`. Nginx publica 80 y 443; el backend conserva 8080 solo en loopback. HTTP disponible únicamente recomendado para pruebas.

V7 crea claves API por propietario y conexión. Claves aleatorias, huella SHA-256 almacenada, expiración de 30 días y revocación; el valor se muestra solo al crear. La API admite SELECT e INSERT/UPDATE/DELETE con permiso explícito, parámetros JDBC separados y una transacción por solicitud. Exige protección de proxy activa y nunca recurre a una conexión directa. Límite PostgreSQL de ejecución de 10 segundos, 100 filas y respuesta limitada; Nginx controla frecuencia y tamaño de peticiones.

Pasaron 23 pruebas Java y pruebas reales de HTTP/HTTPS con Aiven: consulta parametrizada, SQL peligroso usado como dato, ataque bloqueado 406/42501, clave inválida/revocada, aislamiento entre conexiones y escritura autorizada sobre cero filas. Claves de prueba revocadas. Documentación y ejemplos en `API_INTEGRATION.md`.

Respaldo anterior: `/opt/dbshield/backups/antes-api-integracion.sql`, `backend.antes-api-integracion.jar`, `compose.antes-api-integracion.yml` y `nginx.antes-api-integracion.conf`.
