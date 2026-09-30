DELETE FROM users WHERE username IN ('admin', 'Razself@gmail.com');
INSERT INTO users (username, password, full_name, country, city, phone, role, is_active) VALUES ('admin', '$2a$10$CwiMtRKfrLOSXUD14CTXlu2K5.insv/2Z4heUTP7IelRbvWStaFXm', 'Administrador', 'CO', 'Bogota', '3000000000', 'ADMIN_DBA', true);
INSERT INTO users (username, password, full_name, country, city, phone, role, is_active) VALUES ('Razself@gmail.com', '$2a$10$RPS.b7G7oo5r5K/ZnYXrHe.Zp61NQEWIcalDtIcdS3EUkaUXDaJSC', 'Stevie', 'Peru', 'Tacna', '979739029', 'ADMIN_DBA', true);
