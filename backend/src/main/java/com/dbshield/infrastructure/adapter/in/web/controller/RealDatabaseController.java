package com.dbshield.infrastructure.adapter.in.web.controller;
import com.dbshield.application.service.DatabaseAccessService;
import com.dbshield.infrastructure.adapter.out.jdbc.PersistentClientDatabaseAdapter;
import com.dbshield.infrastructure.adapter.out.jdbc.SelectedDatabaseConnection;
import com.dbshield.infrastructure.adapter.out.persistence.DatabaseConnectionRepository;
import com.dbshield.infrastructure.adapter.out.persistence.entity.DatabaseConnectionEntity;
import com.dbshield.infrastructure.security.ConnectionCredentials;
import com.dbshield.infrastructure.security.ImportedCaSslFactory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import java.security.Principal;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.*;

@RestController @RequestMapping("/api/v1/databases") @RequiredArgsConstructor
public class RealDatabaseController {
    private final DatabaseConnectionRepository repository;
    private final PersistentClientDatabaseAdapter adapter;
    private final SelectedDatabaseConnection connector;
    private final ConnectionCredentials credentials;
    private final DatabaseAccessService access;
    public record ConnectionRequest(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]+") String name,
        @NotBlank @Pattern(regexp="[A-Za-z0-9.\\[\\]:_-]+") String host,
        @Min(1) @Max(65535) int port, @NotBlank String type, @NotBlank String user, String pass,
        Boolean sslEnabled, @Size(max=262144) String sslCaPem, @Size(max=255) String sslCaName) {}
    public record StatusRequest(boolean active) {}
    @GetMapping
    public List<Map<String, Object>> list(Principal user) {
        return (access.isAdmin(user.getName()) ? repository.findAll() : repository.findByOwner(user.getName())).stream().map(this::view).toList();
    }
    @PostMapping @Transactional
    public Map<String, Object> create(Principal user, @Valid @RequestBody ConnectionRequest request) {
        DatabaseConnectionEntity db = repository.findByOwnerAndHostAndPortAndName(user.getName(), request.host(), request.port(), request.name()).orElseGet(DatabaseConnectionEntity::new);
        db.setOwner(user.getName()); configure(db, request); test(db); db.setActive(true);
        return view(repository.save(db));
    }
    @PutMapping("/{id}") @Transactional
    public Map<String, Object> update(Principal user, @PathVariable Long id, @Valid @RequestBody ConnectionRequest request) {
        DatabaseConnectionEntity db = access.require(user.getName(), id, false);
        configure(db, request); test(db); return view(repository.save(db));
    }
    @PatchMapping("/{id}/status") @Transactional
    public Map<String, Object> status(Principal user, @PathVariable Long id, @RequestBody StatusRequest request) {
        DatabaseConnectionEntity db = access.require(user.getName(), id, false);
        if (request.active()) test(db);
        db.setActive(request.active()); return view(repository.save(db));
    }
    @PostMapping("/test")
    public Map<String, Object> testConnection(@Valid @RequestBody ConnectionRequest request) {
        DatabaseConnectionEntity db = new DatabaseConnectionEntity(); configure(db, request); test(db);
        return Map.of("message", "Conexión verificada con " + db.getName());
    }
    private void configure(DatabaseConnectionEntity db, ConnectionRequest request) {
        String type = switch(request.type().toUpperCase(Locale.ROOT)) {
            case "POSTGRESQL", "POSTGRES" -> "POSTGRES";
            case "MYSQL" -> "MYSQL";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Motor de base de datos no válido.");
        };
        db.setName(request.name()); db.setHost(request.host()); db.setPort(request.port());
        db.setType(type); db.setUsername(request.user());
        if (request.pass() != null && !request.pass().isEmpty()) db.setEncryptedPassword(credentials.encrypt(request.pass()));
        if (db.getEncryptedPassword() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ingresa la contraseña de conexión.");
        if (request.sslEnabled() != null) db.setSslEnabled(request.sslEnabled());
        if (db.isSslEnabled() && !type.equals("POSTGRES")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La importación SSL está disponible para PostgreSQL.");
        if (request.sslCaPem() != null) {
            if (!request.sslCaPem().isBlank()) {
                try { ImportedCaSslFactory.certificates(request.sslCaPem()); }
                catch (java.security.cert.CertificateException error) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Certificado CA inválido. Importa un archivo PEM (.pem o .crt), sin claves privadas, máximo 256 KB."); }
                db.setSslCaPem(request.sslCaPem());
                db.setSslCaName(request.sslCaName() == null || request.sslCaName().isBlank() ? "certificado-ca.pem" : request.sslCaName());
            } else { db.setSslCaPem(null); db.setSslCaName(null); }
        }
        if (!db.isSslEnabled()) { db.setSslCaPem(null); db.setSslCaName(null); }
    }
    private void test(DatabaseConnectionEntity db) {
        try (Connection connection = connector.openDirect(adapter.map(db))) {
            if (!connection.isValid(5)) throw new SQLException("Conexión no disponible");
        } catch (SQLException error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, db.isSslEnabled()
                ? "No se pudo conectar con SSL. Verifica el certificado CA del proveedor, el dominio exacto, puerto, nombre de base y credenciales."
                : "No se pudo conectar a la base seleccionada. Verifica host, puerto, nombre y credenciales.");
        }
    }
    private Map<String, Object> view(DatabaseConnectionEntity db) {
        Map<String, Object> result = new LinkedHashMap<>(Map.of("id", db.getId(), "name", db.getName(), "host", db.getHost(), "port", db.getPort(),
            "type", db.getType().equals("POSTGRES") ? "PostgreSQL" : "MySQL", "user", db.getUsername(), "active", db.isActive(), "owner", db.getOwner()));
        result.put("sslEnabled", db.isSslEnabled());
        result.put("sslCaName", db.getSslCaName() == null ? "" : db.getSslCaName());
        result.put("hasSslCa", db.getSslCaPem() != null && !db.getSslCaPem().isBlank());
        return result;
    }
}
