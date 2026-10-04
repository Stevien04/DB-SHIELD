-- Modelo de consulta separado por función, sin renombrar ni eliminar tablas existentes.
-- PostgreSQL. El backend continúa escribiendo en public y los triggers sincronizan sistema.
CREATE SCHEMA IF NOT EXISTS sistema;
-- Ejecutar con psql --single-transaction: evita escrituras mientras se instala la sincronización.
LOCK TABLE public.users, public.audit_logs IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS sistema.roles (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);
INSERT INTO sistema.roles (codigo, nombre)
VALUES ('USER', 'Cliente'), ('ADMIN_DBA', 'Administrador del sistema')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO sistema.roles (codigo, nombre)
SELECT DISTINCT role, role FROM public.users ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS sistema.usuarios (
    id BIGINT PRIMARY KEY REFERENCES public.users(id),
    nombre_usuario VARCHAR(100) NOT NULL UNIQUE,
    codigo_rol VARCHAR(20) NOT NULL REFERENCES sistema.roles(codigo),
    activo BOOLEAN NOT NULL
);
CREATE TABLE IF NOT EXISTS sistema.perfiles_usuarios (
    usuario_id BIGINT PRIMARY KEY REFERENCES sistema.usuarios(id),
    nombre_completo VARCHAR(255),
    pais VARCHAR(255),
    ciudad VARCHAR(255),
    telefono VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS sistema.vinculaciones_google (
    usuario_id BIGINT PRIMARY KEY REFERENCES sistema.usuarios(id),
    identificador_google VARCHAR(255) UNIQUE
);
CREATE TABLE IF NOT EXISTS sistema.suspensiones_usuarios (
    usuario_id BIGINT PRIMARY KEY REFERENCES sistema.usuarios(id),
    motivo VARCHAR(255),
    fecha_suspension TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sistema.registros_auditoria (
    id BIGINT PRIMARY KEY REFERENCES public.audit_logs(id),
    fecha_hora TIMESTAMP NOT NULL,
    nombre_usuario VARCHAR(100),
    accion VARCHAR(100),
    detalles TEXT,
    huella_anterior VARCHAR(64),
    huella VARCHAR(64) NOT NULL UNIQUE
);

INSERT INTO sistema.usuarios (id, nombre_usuario, codigo_rol, activo)
SELECT id, username, role, is_active FROM public.users
ON CONFLICT (id) DO UPDATE SET nombre_usuario = EXCLUDED.nombre_usuario,
    codigo_rol = EXCLUDED.codigo_rol, activo = EXCLUDED.activo;
INSERT INTO sistema.perfiles_usuarios (usuario_id, nombre_completo, pais, ciudad, telefono)
SELECT id, full_name, country, city, phone FROM public.users
ON CONFLICT (usuario_id) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo,
    pais = EXCLUDED.pais, ciudad = EXCLUDED.ciudad, telefono = EXCLUDED.telefono;
INSERT INTO sistema.vinculaciones_google (usuario_id, identificador_google)
SELECT id, google_subject FROM public.users WHERE google_subject IS NOT NULL
ON CONFLICT (usuario_id) DO UPDATE SET identificador_google = EXCLUDED.identificador_google;
INSERT INTO sistema.suspensiones_usuarios (usuario_id, motivo, fecha_suspension)
SELECT id, ban_reason, banned_at FROM public.users WHERE NOT is_active OR ban_reason IS NOT NULL OR banned_at IS NOT NULL
ON CONFLICT (usuario_id) DO UPDATE SET motivo = EXCLUDED.motivo, fecha_suspension = EXCLUDED.fecha_suspension;
INSERT INTO sistema.registros_auditoria (id, fecha_hora, nombre_usuario, accion, detalles, huella_anterior, huella)
SELECT id, timestamp, username, action, details, previous_hash, hash FROM public.audit_logs
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION sistema.sincronizar_usuario() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO sistema.roles (codigo, nombre) VALUES (NEW.role, NEW.role)
        ON CONFLICT (codigo) DO NOTHING;
    INSERT INTO sistema.usuarios (id, nombre_usuario, codigo_rol, activo)
        VALUES (NEW.id, NEW.username, NEW.role, NEW.is_active)
        ON CONFLICT (id) DO UPDATE SET nombre_usuario = EXCLUDED.nombre_usuario,
            codigo_rol = EXCLUDED.codigo_rol, activo = EXCLUDED.activo;
    INSERT INTO sistema.perfiles_usuarios (usuario_id, nombre_completo, pais, ciudad, telefono)
        VALUES (NEW.id, NEW.full_name, NEW.country, NEW.city, NEW.phone)
        ON CONFLICT (usuario_id) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo,
            pais = EXCLUDED.pais, ciudad = EXCLUDED.ciudad, telefono = EXCLUDED.telefono;
    IF NEW.google_subject IS NOT NULL OR EXISTS (SELECT 1 FROM sistema.vinculaciones_google WHERE usuario_id = NEW.id) THEN
        INSERT INTO sistema.vinculaciones_google (usuario_id, identificador_google)
            VALUES (NEW.id, NEW.google_subject)
            ON CONFLICT (usuario_id) DO UPDATE SET identificador_google = EXCLUDED.identificador_google;
    END IF;
    IF NOT NEW.is_active OR NEW.ban_reason IS NOT NULL OR NEW.banned_at IS NOT NULL
        OR EXISTS (SELECT 1 FROM sistema.suspensiones_usuarios WHERE usuario_id = NEW.id) THEN
        INSERT INTO sistema.suspensiones_usuarios (usuario_id, motivo, fecha_suspension)
            VALUES (NEW.id, NEW.ban_reason, NEW.banned_at)
            ON CONFLICT (usuario_id) DO UPDATE SET motivo = EXCLUDED.motivo, fecha_suspension = EXCLUDED.fecha_suspension;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sistema.sincronizar_auditoria() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO sistema.registros_auditoria (id, fecha_hora, nombre_usuario, accion, detalles, huella_anterior, huella)
        VALUES (NEW.id, NEW.timestamp, NEW.username, NEW.action, NEW.details, NEW.previous_hash, NEW.hash)
        ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sincronizar_usuario_espanol' AND tgrelid = 'public.users'::regclass) THEN
        CREATE TRIGGER sincronizar_usuario_espanol AFTER INSERT OR UPDATE ON public.users
        FOR EACH ROW EXECUTE FUNCTION sistema.sincronizar_usuario();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sincronizar_auditoria_espanol' AND tgrelid = 'public.audit_logs'::regclass) THEN
        CREATE TRIGGER sincronizar_auditoria_espanol AFTER INSERT ON public.audit_logs
        FOR EACH ROW EXECUTE FUNCTION sistema.sincronizar_auditoria();
    END IF;
END;
$$;

COMMENT ON SCHEMA sistema IS 'Tablas en español para consulta; sincronizadas desde las tablas originales del backend.';
COMMENT ON TABLE sistema.usuarios IS 'Cuentas y estado. Las contraseñas siguen únicamente en la tabla original.';
COMMENT ON TABLE sistema.perfiles_usuarios IS 'Datos personales separados de la cuenta.';
COMMENT ON TABLE sistema.roles IS 'Catálogo de roles del sistema.';
COMMENT ON TABLE sistema.vinculaciones_google IS 'Identificadores de las cuentas vinculadas con Google.';
COMMENT ON TABLE sistema.suspensiones_usuarios IS 'Estado actual de suspensión; un usuario reactivado puede conservar una fila con motivo y fecha vacíos.';
COMMENT ON TABLE sistema.registros_auditoria IS 'Copia de consulta en español de la auditoría; conserva sus huellas originales.';
