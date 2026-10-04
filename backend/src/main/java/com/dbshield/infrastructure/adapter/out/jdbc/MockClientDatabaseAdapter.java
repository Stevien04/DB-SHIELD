package com.dbshield.infrastructure.adapter.out.jdbc;
import com.dbshield.application.port.out.ClientDatabaseRepositoryPort;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DbType;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Optional;
public class MockClientDatabaseAdapter implements ClientDatabaseRepositoryPort {
    @Override
    public List<ClientDatabase> findAll() { return List.of(); }
    @Override
    public List<ClientDatabase> findByUsername(String username) { return List.of(); }
    @Override
    public Optional<ClientDatabase> findById(Long id) {
        return Optional.of(ClientDatabase.builder()
            .id(1L)
            .name("Mock DB")
            .host("localhost")
            .port(5432)
            .dbName("postgres")
            .username("sa")
            .encryptedPassword("password")
            .dbType(DbType.POSTGRES)
            .quarantineTable("test_table")
            .quarantinePkColumn("id")
            .quarantineFlagColumn("is_quarantined")
            .build());
    }
}

