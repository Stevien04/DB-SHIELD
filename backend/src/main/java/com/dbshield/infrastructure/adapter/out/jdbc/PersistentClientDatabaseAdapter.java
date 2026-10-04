package com.dbshield.infrastructure.adapter.out.jdbc;
import com.dbshield.application.port.out.ClientDatabaseRepositoryPort;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DbType;
import com.dbshield.infrastructure.adapter.out.persistence.DatabaseConnectionRepository;
import com.dbshield.infrastructure.adapter.out.persistence.entity.DatabaseConnectionEntity;
import com.dbshield.infrastructure.security.ConnectionCredentials;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Optional;

@Component @RequiredArgsConstructor
public class PersistentClientDatabaseAdapter implements ClientDatabaseRepositoryPort {
    private final DatabaseConnectionRepository repository;
    private final ConnectionCredentials credentials;
    public ClientDatabase map(DatabaseConnectionEntity e) {
        return ClientDatabase.builder().id(e.getId()).name(e.getName()).dbName(e.getName())
            .host(e.getHost()).port(e.getPort()).username(e.getUsername())
            .encryptedPassword(credentials.decrypt(e.getEncryptedPassword()))
            .dbType(DbType.valueOf(e.getType())).active(e.isActive())
            .sslEnabled(e.isSslEnabled()).sslCaPem(e.getSslCaPem()).proxyPort(e.getProxyPort()).build();
    }
    public List<ClientDatabase> findAll() { return repository.findAll().stream().map(this::map).toList(); }
    public List<ClientDatabase> findByUsername(String user) { return repository.findByOwner(user).stream().map(this::map).toList(); }
    public Optional<ClientDatabase> findById(Long id) { return repository.findById(id).map(this::map); }
}
