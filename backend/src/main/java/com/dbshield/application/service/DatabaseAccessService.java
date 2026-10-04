package com.dbshield.application.service;
import com.dbshield.infrastructure.adapter.out.persistence.DatabaseConnectionRepository;
import com.dbshield.infrastructure.adapter.out.persistence.UserRepository;
import com.dbshield.infrastructure.adapter.out.persistence.entity.DatabaseConnectionEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service @RequiredArgsConstructor
public class DatabaseAccessService {
    private final DatabaseConnectionRepository connections;
    private final UserRepository users;
    public boolean isAdmin(String user) {
        return users.findByUsername(user).map(u -> u.getRole().replace("ROLE_", "").equals("ADMIN_DBA")).orElse(false);
    }
    public DatabaseConnectionEntity require(String user, Long id, boolean active) {
        DatabaseConnectionEntity db = connections.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La conexión seleccionada no existe."));
        if (!db.getOwner().equals(user) && !isAdmin(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes acceso a esa base de datos.");
        if (active && !db.isActive()) throw new ResponseStatusException(HttpStatus.CONFLICT, "La conexión seleccionada está deshabilitada.");
        return db;
    }
}
