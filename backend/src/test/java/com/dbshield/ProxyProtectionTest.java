package com.dbshield;
import com.dbshield.application.service.DatabaseAccessService;
import com.dbshield.infrastructure.adapter.in.web.controller.ProxyProtectionController;
import com.dbshield.infrastructure.adapter.out.persistence.entity.DatabaseConnectionEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.*;
import java.time.Instant;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class ProxyProtectionTest {
    @TempDir Path directory;
    @Test void externalRouteRequiresCurrentCertificateAndIsolatesConnections() throws Exception {
        var access = mock(DatabaseAccessService.class);
        var db = new DatabaseConnectionEntity();
        db.setId(7L); db.setName("defaultdb"); db.setHost("provider.example"); db.setPort(15873);
        db.setType("POSTGRES"); db.setUsername("avnadmin"); db.setSslEnabled(true); db.setProxyPort(15432);
        when(access.require("cliente", 7L, true)).thenReturn(db);
        var controller = new ProxyProtectionController(access, new ObjectMapper(), mock(com.dbshield.application.service.ProxyRouteService.class), mock(com.dbshield.infrastructure.adapter.out.jdbc.PersistentClientDatabaseAdapter.class), mock(com.dbshield.infrastructure.adapter.out.jdbc.SelectedDatabaseConnection.class));
        ReflectionTestUtils.setField(controller, "eventsDir", directory.toString());
        ReflectionTestUtils.setField(controller, "publicHost", "31.220.88.80");
        ReflectionTestUtils.setField(controller, "internalHost", "sql-proxy");
        String revision = com.dbshield.application.service.ProxyRouteService.revision(db);
        Files.writeString(directory.resolve("status.json"), "{\"timestamp\":"+Instant.now().getEpochSecond()+",\"routes\":{\"7\":{\"revision\":\""+revision+"\"}}}");
        Files.writeString(directory.resolve("blocked.jsonl"), "{\"database\":\"defaultdb\",\"connectionId\":7}\n{\"database\":\"defaultdb\",\"connectionId\":8}\n{\"database\":\"defaultdb\"}\n");
        var result = controller.protection(() -> "cliente", 7L);
        assertEquals(true, result.get("enabled"));
        assertEquals(1, ((List<?>)result.get("events")).size());
        assertEquals(15432, result.get("clientPort"));
        db.setSslCaPem("changed certificate");
        assertEquals(false, controller.protection(() -> "cliente", 7L).get("enabled"));
    }
    @Test void isolatesDatabaseAndRejectsStaleHeartbeat() throws Exception {
        var access = mock(DatabaseAccessService.class);
        var db = new DatabaseConnectionEntity();
        db.setId(1L); db.setName("tienda"); db.setHost("31.220.88.80"); db.setPort(5432); db.setType("POSTGRES");
        when(access.require("cliente", 1L, true)).thenReturn(db);
        var controller = new ProxyProtectionController(access, new ObjectMapper(), mock(com.dbshield.application.service.ProxyRouteService.class), mock(com.dbshield.infrastructure.adapter.out.jdbc.PersistentClientDatabaseAdapter.class), mock(com.dbshield.infrastructure.adapter.out.jdbc.SelectedDatabaseConnection.class));
        ReflectionTestUtils.setField(controller, "eventsDir", directory.toString());
        ReflectionTestUtils.setField(controller, "publicHost", "31.220.88.80");
        ReflectionTestUtils.setField(controller, "internalHost", "sql-proxy");
        Files.writeString(directory.resolve("status.json"), "{\"timestamp\":" + Instant.now().getEpochSecond() + "}");
        Files.writeString(directory.resolve("blocked.jsonl"), "{\"database\":\"tienda\",\"rule\":\"TAUTOLOGIA_OR\"}\n{\"database\":\"otra_base\",\"rule\":\"TAUTOLOGIA_OR\"}\n{incompleto");
        var result = controller.protection(() -> "cliente", 1L);
        assertEquals(true, result.get("enabled"));
        assertEquals(1, ((List<?>)result.get("events")).size());
        Files.writeString(directory.resolve("status.json"), "{\"timestamp\":0}");
        assertEquals(false, controller.protection(() -> "cliente", 1L).get("enabled"));
        db.setHost("otra-tienda.example");
        assertEquals(false, controller.protection(() -> "cliente", 1L).get("enabled"));
        verify(access, times(3)).require("cliente", 1L, true);
    }
}
