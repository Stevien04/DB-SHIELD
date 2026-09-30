package com.dbshield.infrastructure.adapter.out.audit;

import com.dbshield.application.port.out.AuditPort;
import com.dbshield.infrastructure.adapter.out.persistence.AuditLogRepository;
import com.dbshield.infrastructure.adapter.out.persistence.entity.AuditLogEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

@Slf4j
@Component
@Primary
@RequiredArgsConstructor
public class ImmutableAuditAdapter implements AuditPort {

    private final AuditLogRepository repository;

    @Override
    public synchronized void logAdminAction(String username, String action, String details) {
        try {
            LocalDateTime now = LocalDateTime.now();
            String previousHash = repository.findTopByOrderByIdDesc()
                    .map(AuditLogEntity::getHash)
                    .orElse("0000000000000000000000000000000000000000000000000000000000000000"); // Genesis hash

            String rawData = previousHash + username + action + details + now.toString();
            String currentHash = generateSha256(rawData);

            AuditLogEntity entity = new AuditLogEntity();
            entity.setTimestamp(now);
            entity.setUsername(username);
            entity.setAction(action);
            entity.setDetails(details);
            entity.setPreviousHash(previousHash);
            entity.setHash(currentHash);

            repository.save(entity);
            
            // Syslog JSON format simulacin a stdout (Fase 6)
            log.info("SYSLOG-JSON: {\"timestamp\":\"{}\", \"user\":\"{}\", \"action\":\"{}\", \"hash\":\"{}\"}", 
                now, username, action, currentHash);
                
        } catch (Exception e) {
            log.error("CRITICO: Fallo al guardar en la bitacora inmutable", e);
        }
    }

    private String generateSha256(String data) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = digest.digest(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hashBytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
