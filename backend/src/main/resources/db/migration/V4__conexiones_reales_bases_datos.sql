CREATE SCHEMA IF NOT EXISTS sistema;
CREATE TABLE sistema.conexiones_bases_datos (
    id BIGSERIAL PRIMARY KEY,
    propietario VARCHAR(100) NOT NULL REFERENCES public.users(username),
    nombre VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    puerto INTEGER NOT NULL CHECK (puerto BETWEEN 1 AND 65535),
    motor VARCHAR(20) NOT NULL CHECK (motor IN ('POSTGRES', 'MYSQL')),
    usuario_conexion VARCHAR(255) NOT NULL,
    contrasena_cifrada TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (propietario, host, puerto, nombre)
);
