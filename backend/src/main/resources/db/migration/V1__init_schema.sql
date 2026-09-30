CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    country VARCHAR(100),
    city VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);
-- Hash BCrypt para 'admin123'
INSERT INTO users (username, password, full_name, country, city, phone, role, is_active)
VALUES ('admin', '$2a$10$CwiMtRKfrLOSXUD14CTXlu2K5.insv/2Z4heUTP7IelRbvWStaFXm', 'Administrador', 'CO', 'Bogota', '3000000000', 'ADMIN_DBA', true);