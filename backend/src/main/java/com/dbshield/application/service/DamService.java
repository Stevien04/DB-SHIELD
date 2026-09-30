package com.dbshield.application.service;

import com.dbshield.application.port.in.DamUseCase;
import com.dbshield.application.port.out.ClientDatabaseRepositoryPort;
import com.dbshield.application.port.out.DamPort;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DamEvent;
import com.dbshield.infrastructure.adapter.out.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DamService implements DamUseCase {

    private final DamPort damPort;
    private final ClientDatabaseRepositoryPort dbRepository;
    private final UserRepository userRepository;

    @Override
    public List<DamEvent> getLiveEvents(String username, Long databaseId) {
        ClientDatabase db = dbRepository.findById(databaseId).orElseThrow(() -> new IllegalArgumentException("DB not found"));
        
        // Validacin de permisos RA-08
        boolean isAdmin = userRepository.findByUsername(username)
                .map(u -> u.getRole().contains("ADMIN_DBA"))
                .orElse(false);
                
        if (!isAdmin) {
            boolean hasAccess = dbRepository.findByUsername(username).stream().anyMatch(d -> d.getId().equals(databaseId));
            if (!hasAccess) throw new SecurityException("No tiene acceso a esta base de datos");
        }
        
        return damPort.getActiveQueries(db);
    }
}
