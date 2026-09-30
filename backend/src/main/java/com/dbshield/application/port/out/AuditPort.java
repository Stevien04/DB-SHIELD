package com.dbshield.application.port.out;
public interface AuditPort {
    void logAdminAction(String username, String action, String details);
}
