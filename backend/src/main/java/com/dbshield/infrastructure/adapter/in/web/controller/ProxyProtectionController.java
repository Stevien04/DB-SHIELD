package com.dbshield.infrastructure.adapter.in.web.controller;

import com.dbshield.application.service.DatabaseAccessService;
import com.dbshield.application.service.ProxyRouteService;
import com.dbshield.infrastructure.adapter.out.jdbc.PersistentClientDatabaseAdapter;
import com.dbshield.infrastructure.adapter.out.jdbc.SelectedDatabaseConnection;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.Principal;
import java.time.Instant;
import java.util.*;

@RestController @RequestMapping("/api/v1/dam") @RequiredArgsConstructor
public class ProxyProtectionController {
    private final DatabaseAccessService access;
    private final ObjectMapper mapper;
    private final ProxyRouteService routes;
    private final PersistentClientDatabaseAdapter adapter;
    private final SelectedDatabaseConnection connector;
    @Value("${DBSHIELD_PROXY_EVENTS_DIR:}") private String eventsDir;
    @Value("${DBSHIELD_PUBLIC_HOST:}") private String publicHost;
    @Value("${DBSHIELD_INTERNAL_HOST:}") private String internalHost;

    @GetMapping("/protection")
    public Map<String, Object> protection(Principal principal, @RequestParam Long databaseId) {
        var db = access.require(principal.getName(), databaseId, true);
        boolean eligible = db.getType().equals("POSTGRES") && db.getPort() == 5432
            && (db.getHost().equals(publicHost) || db.getHost().equals("127.0.0.1") || db.getHost().equals("localhost") || db.getHost().equals(internalHost));
        boolean online = false;
        List<JsonNode> events = new ArrayList<>();
        boolean external = db.getProxyPort() != null;
        if ((eligible || external) && !eventsDir.isBlank()) {
            Path directory = Path.of(eventsDir);
            try {
                JsonNode status = mapper.readTree(directory.resolve("status.json").toFile());
                online = Math.abs(Instant.now().getEpochSecond() - status.path("timestamp").asLong()) < 45;
                if (external) online = online && status.path("routes").path(String.valueOf(db.getId())).path("revision").asText().equals(ProxyRouteService.revision(db));
                Path log = directory.resolve("blocked.jsonl");
                if (Files.exists(log)) {
                    try (RandomAccessFile file = new RandomAccessFile(log.toFile(), "r")) {
                        long start = Math.max(0, file.length() - 1024 * 1024);
                        file.seek(start);
                        if (start > 0) file.readLine();
                        byte[] bytes = new byte[(int)(file.length() - file.getFilePointer())];
                        file.readFully(bytes);
                        for (String line : new String(bytes, StandardCharsets.UTF_8).split("\n")) {
                            try {
                                JsonNode event = mapper.readTree(line);
                                if (event != null && event.path("database").asText().equals(db.getName())
                                    && (external ? event.path("connectionId").asLong(-1)==databaseId : !event.has("connectionId"))) events.add(event);
                            } catch (Exception ignored) { /* Una escritura incompleta se reintenta en el siguiente sondeo. */ }
                        }
                    }
                }
            } catch (Exception ignored) { online = false; }
        }
        Collections.reverse(events);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("enabled", (eligible || external) && online);
        result.put("databaseId", databaseId);
        result.put("message", (eligible || external) && online ? "Proxy PostgreSQL activo. Las conexiones del túnel SSH pasan por la inspección."
            : "Esta conexión no tiene un proxy activo de DB-Shield. El monitor por sí solo no bloquea conexiones directas.");
        result.put("canConfigure", !eligible && db.getType().equals("POSTGRES") && db.isSslEnabled());
        result.put("proxyPort", external ? db.getProxyPort() : 5432);
        result.put("sshCommand", "ssh -N -L "+(external?db.getProxyPort():5434)+":127.0.0.1:"+(external?db.getProxyPort():5432)+" root@"+publicHost);
        result.put("clientPort", external ? db.getProxyPort() : 5434);
        result.put("databaseName", db.getName()); result.put("databaseUser", db.getUsername());
        result.put("events", events.stream().limit(50).toList());
        return result;
    }
    public record ProxyRequest(Long databaseId) {}
    @PostMapping("/proxy")
    public Map<String,Object> enable(Principal principal, @RequestBody ProxyRequest request) {
        if (request.databaseId()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecciona una base.");
        var db = access.require(principal.getName(), request.databaseId(), true);
        try (var connection = connector.openDirect(adapter.map(db))) {
            if (!connection.isValid(5)) throw new java.sql.SQLException();
        } catch (java.sql.SQLException error) { throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo verificar la conexión SSL del proveedor. Revisa credenciales y CA."); }
        return Map.of("proxyPort", routes.enable(db), "message", "Proxy solicitado. Su estado se actualizará en unos segundos.");
    }
}
