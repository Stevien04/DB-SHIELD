package com.dbshield.infrastructure.adapter.out.audit;

import com.dbshield.application.port.out.AuditPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SyslogAuditAdapter implements AuditPort {
    @Override
    public void logAdminAction(String username, String action, String details) {
        // RA-09 y RA-07: Bitácora forense inmutable (Syslog/JSON simulado para esta fase)
        // La implementación real con Syslog y Hashing encadenado irá en la Fase 6
        log.info("AUDIT - USER: [{}] ACTION: [{}] DETAILS: [{}]", username, action, details);
    }
}
