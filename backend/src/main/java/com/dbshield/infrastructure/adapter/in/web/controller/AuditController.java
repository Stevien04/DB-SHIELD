package com.dbshield.infrastructure.adapter.in.web.controller;
import com.dbshield.application.port.in.AuditQueryUseCase;
import com.dbshield.domain.model.AuditEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/v1/audit-log")
@RequiredArgsConstructor
public class AuditController {
    private final AuditQueryUseCase auditQueryUseCase;

    // RA-07: Bitcora para el administrador
    
    @GetMapping
    public ResponseEntity<List<AuditEntry>> getLogs() {
        return ResponseEntity.ok(auditQueryUseCase.listAllLogs());
    }
}
