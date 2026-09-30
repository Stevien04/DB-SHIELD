package com.dbshield.application.port.in;
import com.dbshield.domain.model.AuditEntry;
import java.util.List;
public interface AuditQueryUseCase {
    List<AuditEntry> listAllLogs();
}
