package com.dbshield.infrastructure.adapter.out.persistence.entity;
import jakarta.persistence.*;
import lombok.Data;

@Data @Entity @Table(name = "conexiones_bases_datos", schema = "sistema")
public class DatabaseConnectionEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "propietario", nullable = false) private String owner;
    @Column(name = "nombre", nullable = false) private String name;
    @Column(name = "host", nullable = false) private String host;
    @Column(name = "puerto", nullable = false) private int port;
    @Column(name = "motor", nullable = false) private String type;
    @Column(name = "usuario_conexion", nullable = false) private String username;
    @Column(name = "contrasena_cifrada", nullable = false, columnDefinition = "TEXT") private String encryptedPassword;
    @Column(name = "activa", nullable = false) private boolean active = true;
    @Column(name = "ssl_habilitado", nullable = false) private boolean sslEnabled;
    @Column(name = "certificado_ca_pem", columnDefinition = "TEXT") private String sslCaPem;
    @Column(name = "certificado_ca_nombre") private String sslCaName;
    @Column(name = "puerto_proxy", unique = true) private Integer proxyPort;
}
