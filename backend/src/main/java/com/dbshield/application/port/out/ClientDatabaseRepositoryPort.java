package com.dbshield.application.port.out;

import com.dbshield.domain.model.ClientDatabase;
import java.util.List;
import java.util.Optional;

public interface ClientDatabaseRepositoryPort {
    List<ClientDatabase> findAll();
    List<ClientDatabase> findByUsername(String username);
    Optional<ClientDatabase> findById(Long id);
}
