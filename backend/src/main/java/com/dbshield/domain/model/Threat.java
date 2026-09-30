package com.dbshield.domain.model;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
@Data @Builder
public class Threat {
    private Long id;
    private Long clientDatabaseId;
    private String tableName;
    private String columnName;
    private String recordPk;
    private String threatType; // BLOB_MALWARE, SQL_INJECTION_AST
    private String fileHash; // SHA-256
    private boolean isQuarantined;
    private LocalDateTime detectedAt;
}
