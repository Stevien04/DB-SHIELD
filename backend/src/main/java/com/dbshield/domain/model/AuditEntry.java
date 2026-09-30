package com.dbshield.domain.model;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
@Data @Builder
public class AuditEntry {
    private Long id;
    private LocalDateTime timestamp;
    private String username;
    private String action;
    private String details;
    private String previousHash;
    private String hash;
}
