package com.dbshield;
import com.dbshield.application.service.ProxyRouteService;
import com.dbshield.infrastructure.adapter.out.persistence.DatabaseConnectionRepository;
import com.dbshield.infrastructure.adapter.out.persistence.entity.DatabaseConnectionEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class ProxyRouteServiceTest {
    @TempDir Path directory;
    @Test void allocatesUniquePortAndPublishesOnlyActiveTlsRoutesWithoutPassword() throws Exception {
        var repository = mock(DatabaseConnectionRepository.class);
        var first = new DatabaseConnectionEntity();
        first.setId(1L); first.setProxyPort(15432); first.setType("POSTGRES"); first.setSslEnabled(true); first.setActive(true);
        first.setHost("provider.example"); first.setPort(15873); first.setName("defaultdb"); first.setUsername("avnadmin");
        var second = new DatabaseConnectionEntity();
        second.setId(2L); second.setType("POSTGRES"); second.setSslEnabled(true); second.setActive(true);
        second.setHost("another.example"); second.setPort(5432); second.setName("tienda"); second.setUsername("cliente");
        when(repository.findAll()).thenReturn(List.of(first, second));
        var service = new ProxyRouteService(repository, new ObjectMapper());
        ReflectionTestUtils.setField(service, "directory", directory.toString());
        assertEquals(15433, service.enable(second));
        assertEquals(15433, service.enable(second));
        verify(repository, times(1)).saveAndFlush(second);
        service.publish();
        var json = new ObjectMapper().readTree(directory.resolve("routes.json").toFile());
        assertEquals(2, json.size());
        assertFalse(json.get(0).has("password"));
        assertFalse(json.get(0).has("encryptedPassword"));
        first.setActive(false);
        second.setSslEnabled(false);
        service.publish();
        assertEquals(0, new ObjectMapper().readTree(directory.resolve("routes.json").toFile()).size());
    }
}
