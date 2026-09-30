package com.dbshield.application.service;

import com.dbshield.application.port.in.ThreatManageUseCase;
import com.dbshield.application.port.out.AuditPort;
import com.dbshield.application.port.out.ClientDatabasePort;
import com.dbshield.application.port.out.ClientDatabaseRepositoryPort;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.Threat;
import com.dbshield.infrastructure.adapter.out.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ThreatManageService implements ThreatManageUseCase {

    private final ClientDatabaseRepositoryPort dbRepository;
    private final ClientDatabasePort clientDatabasePort;
    private final AuditPort auditPort;
    private final UserRepository userRepository;

    @Override
    public List<Threat> listThreats(String username) {
        // RA-08: Filtrado por propietario
        boolean isAdmin = isAdmin(username);
        List<ClientDatabase> dbs = isAdmin ? dbRepository.findAll() : dbRepository.findByUsername(username);
        
        // Consultar amenazas en VIVO desde las BDs externas (sin persistirlas en internal-db)
        return dbs.stream()
            .flatMap(db -> clientDatabasePort.findQuarantinedRecords(db).stream())
            .collect(Collectors.toList());
    }

    @Override
    public void restoreThreat(String username, Long clientDbId, String pkValue) {
        requireAdmin(username); // Solo DBA
        ClientDatabase db = dbRepository.findById(clientDbId)
            .orElseThrow(() -> new IllegalArgumentException("BD no encontrada"));
            
        clientDatabasePort.restoreRecord(db, db.getQuarantineTable(), db.getQuarantinePkColumn(), db.getQuarantineFlagColumn(), pkValue);
        auditPort.logAdminAction(username, "RESTORE_THREAT", "Restaurado registro " + pkValue + " en DB " + db.getName());
    }

    @Override
    public void purgeThreat(String username, Long clientDbId, String pkValue) {
        requireAdmin(username); // Solo DBA
        ClientDatabase db = dbRepository.findById(clientDbId)
            .orElseThrow(() -> new IllegalArgumentException("BD no encontrada"));
            
        // RA-09: Eliminación irreversible, registrando antes en la bitácora forense
        auditPort.logAdminAction(username, "PURGE_THREAT_PRE", "Depuración irreversible de registro " + pkValue + " en DB " + db.getName());
        clientDatabasePort.deleteRecord(db, db.getQuarantineTable(), db.getQuarantinePkColumn(), pkValue);
    }
    
    private boolean isAdmin(String username) {
        return userRepository.findByUsername(username)
            .map(u -> u.getRole().equals("ADMIN_DBA") || u.getRole().equals("ROLE_ADMIN_DBA"))
            .orElse(false);
    }
    
    private void requireAdmin(String username) {
        if (!isAdmin(username)) {
            throw new SecurityException("Solo el ADMIN_DBA puede realizar esta accion");
        }
    }
}
