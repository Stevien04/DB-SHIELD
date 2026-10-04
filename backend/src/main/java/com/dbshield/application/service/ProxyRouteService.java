package com.dbshield.application.service;
import com.dbshield.infrastructure.adapter.out.persistence.DatabaseConnectionRepository;
import com.dbshield.infrastructure.adapter.out.persistence.entity.DatabaseConnectionEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service @RequiredArgsConstructor
public class ProxyRouteService {
    private final DatabaseConnectionRepository repository;
    private final ObjectMapper mapper;
    @Value("${DBSHIELD_PROXY_EVENTS_DIR:}") private String directory;
    @Configuration @EnableScheduling public static class Scheduling {}

    @Transactional public synchronized int enable(DatabaseConnectionEntity db) {
        if (directory.isBlank()) throw new ResponseStatusException(HttpStatus.CONFLICT, "El servicio de proxy no está configurado.");
        if (!db.getType().equals("POSTGRES") || !db.isSslEnabled()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Activa SSL y verifica la conexión PostgreSQL antes de habilitar su proxy.");
        if (db.getProxyPort() == null) {
            Set<Integer> used = new HashSet<>();
            repository.findAll().forEach(row -> { if (row.getProxyPort() != null) used.add(row.getProxyPort()); });
            int port = 15432;
            while (used.contains(port) && port <= 15463) port++;
            if (port > 15463) throw new ResponseStatusException(HttpStatus.CONFLICT, "No hay puertos disponibles para más proxies.");
            db.setProxyPort(port); repository.saveAndFlush(db);
        }
        return db.getProxyPort();
    }
    @Scheduled(fixedDelay=2000) @Transactional(readOnly=true)
    public synchronized void publish() {
        if (directory.isBlank()) return;
        List<Map<String, Object>> routes = new ArrayList<>();
        for (var db : repository.findAll()) {
            if (db.getProxyPort() == null || !db.isActive() || !db.isSslEnabled() || !db.getType().equals("POSTGRES")) continue;
            Map<String,Object> route = new LinkedHashMap<>();
            route.put("id", db.getId()); route.put("listenPort", db.getProxyPort());
            route.put("targetHost", db.getHost()); route.put("targetPort", db.getPort());
            route.put("database", db.getName()); route.put("user", db.getUsername());
            route.put("sslCaPem", db.getSslCaPem() == null ? "" : db.getSslCaPem());
            route.put("revision", revision(db));
            routes.add(route);
        }
        try {
            Path file = Path.of(directory, "routes.json"), temp = Path.of(directory, "routes.tmp");
            byte[] bytes = mapper.writeValueAsBytes(routes);
            if (Files.exists(file) && Arrays.equals(bytes, Files.readAllBytes(file))) return;
            Files.write(temp, bytes);
            Files.move(temp, file, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception error) { /* El proxy conserva la última configuración válida; no se declara activo sin confirmación. */ }
    }
    public static String revision(DatabaseConnectionEntity db) {
        String value = db.getHost()+"|"+db.getPort()+"|"+db.getName()+"|"+db.getUsername()+"|"+(db.getSslCaPem()==null?"":db.getSslCaPem());
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception error) { throw new IllegalStateException("No se pudo identificar la configuración SSL."); }
    }
}
