package com.dbshield;
import com.dbshield.application.service.DatabaseAccessService;
import com.dbshield.infrastructure.adapter.in.web.controller.RealDatabaseController;
import com.dbshield.infrastructure.adapter.out.jdbc.*;
import com.dbshield.infrastructure.adapter.out.persistence.*;
import com.dbshield.infrastructure.adapter.out.persistence.entity.DatabaseConnectionEntity;
import com.dbshield.infrastructure.security.ConnectionCredentials;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SslRegistrationTest {
    @Test @EnabledIfEnvironmentVariable(named="SSL_TEST_HOST", matches=".+")
    void registersRealTlsConnectionAndPreservesImportedCaOnEdit() throws Exception {
        var repository = mock(DatabaseConnectionRepository.class);
        var access = mock(DatabaseAccessService.class);
        var credentials = new ConnectionCredentials("ssl-registration-test-secret");
        var adapter = new PersistentClientDatabaseAdapter(repository, credentials);
        var connector = new SelectedDatabaseConnection();
        org.springframework.test.util.ReflectionTestUtils.setField(connector, "internalHost", "");
        org.springframework.test.util.ReflectionTestUtils.setField(connector, "publicHost", "");
        var controller = new RealDatabaseController(repository, adapter, connector, credentials, access);
        String ca = Files.readString(Path.of("/tls/ca.pem"));
        when(repository.findByOwnerAndHostAndPortAndName("cliente", "ssl-db", 5432, "ssltest")).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(invocation -> { DatabaseConnectionEntity entity=invocation.getArgument(0); entity.setId(5L); return entity; });
        var view = controller.create(() -> "cliente", new RealDatabaseController.ConnectionRequest("ssltest", "ssl-db", 5432, "PostgreSQL", "ssltest", "test-only-password", true, ca, "aiven-ca.pem"));
        assertEquals(true, view.get("sslEnabled")); assertEquals(true, view.get("hasSslCa"));
        assertFalse(view.containsKey("sslCaPem")); assertFalse(view.containsKey("pass"));
        var captured = org.mockito.ArgumentCaptor.forClass(DatabaseConnectionEntity.class);
        verify(repository).save(captured.capture());
        DatabaseConnectionEntity entity = captured.getValue();
        assertEquals(ca, entity.getSslCaPem()); assertNotEquals("test-only-password", entity.getEncryptedPassword());
        when(access.require("cliente", 5L, false)).thenReturn(entity);
        controller.update(() -> "cliente", 5L, new RealDatabaseController.ConnectionRequest("ssltest", "ssl-db", 5432, "PostgreSQL", "ssltest", "", true, null, "aiven-ca.pem"));
        assertEquals(ca, entity.getSslCaPem());
        assertThrows(ResponseStatusException.class, () -> controller.testConnection(new RealDatabaseController.ConnectionRequest("ssltest", "ssl-db", 5432, "PostgreSQL", "ssltest", "test-only-password", true, "invalid pem", "bad.pem")));
        assertThrows(ResponseStatusException.class, () -> controller.testConnection(new RealDatabaseController.ConnectionRequest("ssltest", "ssl-db", 5432, "PostgreSQL", "ssltest", "test-only-password", true, Files.readString(Path.of("/tls/other.pem")), "wrong-ca.pem")));
    }
}
