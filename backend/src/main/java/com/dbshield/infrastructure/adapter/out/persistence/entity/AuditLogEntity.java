package com.dbshield.infrastructure.adapter.out.persistence.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
@Data @Entity @Table(name = "audit_logs")
public class AuditLogEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private LocalDateTime timestamp;
    private String username;
    private String action;
    private String details;
    @Column(name = "previous_hash")
    private String previousHash;
    @Column(unique = true, nullable = false)
    private String hash;
}
