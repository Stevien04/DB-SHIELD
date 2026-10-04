# Acceso y vinculación con Google

1. Crea un cliente OAuth de tipo **Aplicación web** en Google Cloud y configura la pantalla de consentimiento.
2. En **Orígenes autorizados de JavaScript**, agrega `http://localhost` y el origen HTTPS de producción si corresponde. Para Vite agrega su origen y puerto exactos.
3. Crea un archivo `.env` junto a `docker-compose.yml` con `GOOGLE_CLIENT_ID=tu-identificador.apps.googleusercontent.com`.
4. Ejecuta `docker compose up -d --build backend frontend`.

Esta integración usa Google Identity Services con ventana emergente: no requiere Client Secret ni URI de redirección. El identificador es público; no agregues secretos al frontend.

Una cuenta nueva recibe el rol USER. Si el correo ya existe, se solicita la contraseña local antes de vincularlo. Después se identifica a la cuenta por el identificador estable de Google (`sub`). Las cuentas suspendidas no pueden entrar. El servidor comprueba firma, emisor, vencimiento, audiencia y correo verificado.

Sin Client ID, el botón aparece deshabilitado con un mensaje de configuración pendiente. El inicio de sesión local sigue disponible.

Validación manual cuando el Client ID esté configurado: cuenta nueva; cuenta existente con contraseña correcta e incorrecta; inicio posterior sin contraseña; usuario suspendido; cancelar ventana de Google.

Referencia: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
