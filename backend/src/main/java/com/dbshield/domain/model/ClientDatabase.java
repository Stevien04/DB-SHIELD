package com.dbshield.domain.model;
import lombok.Builder;
import lombok.Data;
@Data @Builder
public class ClientDatabase {
    private Long id;
    private String name;
    private String host;
    private int port;
    private String dbName;
    private String username;
    private String encryptedPassword;
    private DbType dbType;
    // Configuracion de cuarentena
    private String quarantineTable;
    private String quarantinePkColumn;
    private String quarantineFlagColumn;
}
