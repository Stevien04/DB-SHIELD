# Protección PostgreSQL por proxy

El proxy inspecciona Query y Parse del protocolo PostgreSQL antes de reenviar SQL.
Conserva autenticación, parámetros preparados y transacciones. Los bloqueos devuelven
SQLSTATE 42501 con un mensaje DB-Shield. Reemplaza el SQL rechazado por una sentencia
sintácticamente inválida para mantener aborto y sincronización; no reenvía el ataque.

Reglas iniciales: tautologías constantes dentro de OR, UNION, funciones de archivos,
red y espera, COPY, ejecución de código, DDL, cambios de configuración de seguridad,
escrituras de catálogos y UPDATE/DELETE sin filtro. SELECT, INSERT y UPDATE/DELETE con
filtro, transacciones y valores preparados normales funcionan. DDL, COPY y UNION
legítimos también se rechazan bajo esta política; hacer migraciones administrativas
por el canal interno del servidor.

No distingue todas las inyecciones de SQL legítimo. La aplicación debe usar consultas
parametrizadas y un usuario con permisos mínimos. Cubre PostgreSQL, no MySQL ni BLOB.

## VPS

`internal-db` no publica puerto del host. El proxy publica `127.0.0.1:5432` para
la base interna y `127.0.0.1:15432-15463` para hasta 32 conexiones externas.
Clientes remotos usan SSH; no abrir el listener sin cifrado a Internet. El backend
administrativo conserva su canal interno de migraciones. DAM usa el proxy.

HeidiSQL: `ssh -N -L 5434:127.0.0.1:5432 root@31.220.88.80`, conectar a
127.0.0.1:5434, base dbshield, usuario dbshield_user, contraseña de PostgreSQL.
Desconectar y reconectar sesiones anteriores después del despliegue.

Una tienda externa necesita un túnel SSH, y su conexión usará el puerto local del
túnel. Una tienda en la red Docker DB-Shield usa `sql-proxy:5432`. No se modifica
automáticamente ninguna tienda externa.

## Bases externas con SSL

Registrar PostgreSQL con SSL y su CA importada en Bases de Datos. Seleccionarla
en DAM y pulsar «Habilitar proxy para esta base». Antes de asignar un puerto,
el backend verifica las credenciales y el certificado del proveedor. La ruta
persistida en V6 conserva el puerto al reiniciar. DAM confirma el latido de
esa ruta y la revisión del certificado antes de mostrar protección activa.

Cada ruta exige el usuario y nombre de base registrados. El proxy negocia TLS
hacia el proveedor, verifica CA y hostname, y transmite la autenticación real
sin almacenar contraseñas. El registro compartido contiene destinos y CA
públicas; no contiene claves privadas ni contraseñas. Desactivar la base o
SSL elimina la ruta y cierra sus sesiones; cambiar destino o CA también las
cierra para exigir una nueva conexión con la configuración actual.

Para HeidiSQL copiar el túnel indicado en DAM (por ejemplo
`ssh -N -L 15432:127.0.0.1:15432 root@31.220.88.80`). Mientras esté abierto,
conectar a 127.0.0.1:15432 con la base, usuario y contraseña del proveedor.
Desactivar SSL PostgreSQL solo en ese acceso local: SSH cifra el acceso al VPS
y el proxy verifica TLS hacia la base externa. SCRAM-SHA-256 se transmite;
SCRAM-SHA-256-PLUS no se anuncia porque el TLS del proveedor termina en el
proxy. Clientes que exigen channel_binding=require no son compatibles con
este transporte. Conectarse directamente al proveedor evita la inspección.

El ejecutor y monitor DAM usan la ruta asignada. Los bloqueos se filtran por
identificador de conexión, aunque varias bases se llamen `defaultdb`.

Los registros guardan fecha, usuario, origen observado, base y regla. No guardan SQL
completo, valores, contraseñas ni tokens. Con SSH el origen puede ser la puerta Docker;
no es la IP del atacante final. DAM muestra hasta 50 bloqueos recientes de la base.
Los archivos rotan a 5 MiB conservando un anterior; no son historial ilimitado.

## Pruebas

test_policy.py cubre SQL legítimo y variaciones de ataques. test_integration.py cubre
protocolos simple/preparado, parámetros con texto de ataque, ventas y stock,
transacciones, rollback y contraseña incorrecta. Usa una fixture aleatoria y la
retira sin modificar tablas del sistema.

test_external_routes.py usa un PostgreSQL TLS de prueba: verifica certificados
y hostname, autenticación SCRAM, consultas normales, ataques bloqueados,
aislamiento de registros y revocación de puertos.
