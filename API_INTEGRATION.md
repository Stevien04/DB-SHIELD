# API de consultas DB-Shield

Panel: https://31.220.88.80/integration. Iniciar sesión, seleccionar una base PostgreSQL activa y crear una clave. La clave se muestra una vez, vence en 30 días y puede revocarse. Solo lectura por defecto; la escritura requiere habilitar el permiso al crearla. No colocar claves en el frontend ni en el repositorio.

Antes de usar la API, habilitar la protección de la base en el panel Proxy. La API no usa una conexión directa cuando el proxy está fuera de servicio. El cliente solo llama por HTTPS; no necesita SSH ni credenciales del VPS.

POST https://31.220.88.80/api/v1/integration/query

HTTP también está disponible en http://31.220.88.80/api/v1/integration/query para pruebas. Transmite clave y datos sin cifrado; usar HTTPS en producción.

Cabeceras: `Content-Type: application/json`, `X-API-Key: <clave privada del backend>`.

Ejemplo para la conexión Aiven registrada (ID 4; cada cliente debe usar su ID):

```json
{"databaseId":4,"query":"SELECT ? AS valor","parameters":[10]}
```

Usar marcadores JDBC `?` para parámetros y valores simples string/número/boolean/null. No concatenar entradas del usuario. SELECT, INSERT, UPDATE y DELETE son los comandos admitidos; una sentencia por solicitud, sin scripts ni transacciones repartidas entre solicitudes. UPDATE/DELETE necesitan filtro y todas las consultas pasan por la política del proxy. También se rechazan consultas legítimas que incumplan esa política, como UNION.

Cada solicitud abre su propia transacción: lectura con rollback, escritura con commit solamente tras ejecución correcta y rollback ante errores. Límite PostgreSQL de 10 segundos, 100 filas, 100 parámetros, 20000 caracteres de SQL y 250000 caracteres de resultados; los resultados de celdas se devuelven como texto o null. `truncated` indica corte de filas. Datos binarios grandes y operaciones administrativas no son parte de esta API.

Respuestas: 200 con columns/rows/affectedRows; 401 clave ausente/inválida/vencida/revocada o usuario deshabilitado; 403 base ajena o escritura sin permiso; 406 consulta bloqueada; 429 capacidad o frecuencia excedida; 503 protección no disponible. Los bloqueos del proxy se ven en DAM por conexión. No se registran claves, parámetros ni SQL completo en el proxy.

TLS válido para IP emitido por Let's Encrypt con Certbot 5.4, renovación mediante `dbshield-cert-renew.timer`. Certificados en `/opt/dbshield/tls`, privados y no incluidos en el proyecto. HTTP y HTTPS son manejados por Nginx; el backend sigue publicado solo en loopback. Límite Nginx de 5 solicitudes por segundo por IP, ráfaga de 20; máximo 10 ejecuciones simultáneas del backend.

V7 crea `sistema.claves_api`; se almacena SHA-256 de claves aleatorias de 256 bits, con prefijo identificador. Autenticación restringida a una conexión y propietario activo; la API key no permite administrar usuarios, bases o claves. Crear/listar/revocar claves requiere el JWT del panel.

Pruebas: 23 pruebas Java de API y regresiones. Verificación real HTTP/HTTPS con Aiven: parámetros, SQL con aspecto de ataque usado como dato, ataque bloqueado 42501/406, claves inválidas y revocadas, aislamiento de bases y UPDATE con permiso sobre cero filas. Claves de prueba revocadas al terminar. Las aplicaciones externas del VPS se conservan intactas.

Respaldos previos: `/opt/dbshield/backups/antes-api-integracion.sql`, `backend.antes-api-integracion.jar`, `compose.antes-api-integracion.yml`, `nginx.antes-api-integracion.conf`.

La protección solo aplica a llamadas por DB-Shield. Restringir el acceso directo al proveedor para evitar que se omita. No sustituye consultas parametrizadas y permisos mínimos en la base.
