ALTER TABLE sistema.conexiones_bases_datos
    ADD COLUMN ssl_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN certificado_ca_pem TEXT,
    ADD COLUMN certificado_ca_nombre VARCHAR(255);
