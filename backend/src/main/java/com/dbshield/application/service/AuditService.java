package com.dbshield.application.service;
import com.dbshield.application.port.in.AuditQueryUseCase;
import com.dbshield.domain.model.AuditEntry;
import com.dbshield.infrastructure.adapter.out.persistence.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditService implements AuditQueryUseCase {
    private final AuditLogRepository repository;

    @Override
    public List<AuditEntry> listAllLogs() {
        return repository.findAll().stream().map(e -> AuditEntry.builder()
                .id(e.getId())
                .timestamp(e.getTimestamp())
                .username(e.getUsername())
                .action(e.getAction())
                .details(e.getDetails())
                .previousHash(e.getPreviousHash())
                .hash(e.getHash())
                .build()
        ).collect(Collectors.toList());
    }
}
