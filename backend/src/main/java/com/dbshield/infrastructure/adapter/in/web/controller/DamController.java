package com.dbshield.infrastructure.adapter.in.web.controller;

import com.dbshield.application.port.in.DamUseCase;
import com.dbshield.application.port.out.ClientDatabaseRepositoryPort;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DamEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RequestMapping("/api/v1/dam")
@RequiredArgsConstructor
public class DamController {

    private final DamUseCase damUseCase;
    private final ClientDatabaseRepositoryPort dbRepository;

    // RW-07: Visor de Eventos DAM
    @GetMapping("/events")
    public ResponseEntity<List<DamEvent>> getEvents(Principal principal, @RequestParam(required = false) Long databaseId) {
        if (databaseId == null) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(damUseCase.getLiveEvents(principal != null ? principal.getName() : "admin", databaseId));
    }

    // Nuevo Endpoint WAF/DAM Interceptor en Tiempo Real
    @PostMapping("/execute")
    public ResponseEntity<Map<String, Object>> executeQuery(Principal principal, @RequestBody Map<String, String> payload) {
        Map<String, Object> response = new HashMap<>();
        String query = payload.get("query");
        Long dbId = Long.parseLong(payload.get("databaseId"));
        
        // 1. Análisis WAF del String de la Query
        boolean isThreat = false;
        String threatType = "";
        String upperQuery = query.toUpperCase();
        
        if (upperQuery.contains("DROP TABLE") || upperQuery.contains("TRUNCATE TABLE")) {
            isThreat = true;
            threatType = "INYECCIÓN DE COMANDOS DDL (Destrucción de datos)";
        } else if (upperQuery.contains("OR 1=1") || upperQuery.contains("UNION SELECT")) {
            isThreat = true;
            threatType = "INYECCIÓN SQL (Evasión de Autenticación / Exfiltración)";
        } else if (upperQuery.contains("PG_SLEEP") || upperQuery.contains("WAITFOR DELAY")) {
            isThreat = true;
            threatType = "INYECCIÓN SQL CIEGA (Denegación de Servicio)";
        }

        if (isThreat) {
            response.put("blocked", true);
            response.put("message", "WAF INTERCEPTÓ LA CONSULTA: " + threatType);
            response.put("status", HttpStatus.NOT_ACCEPTABLE.value());
            return ResponseEntity.status(HttpStatus.NOT_ACCEPTABLE).body(response);
        }

        // 2. Si no es amenaza, la ejecutamos REALMENTE en la BD cliente
        try {
            ClientDatabase db = dbRepository.findById(dbId).orElseThrow(() -> new RuntimeException("DB no encontrada"));
            String dbHost = db.getHost(); if ("localhost".equals(dbHost) || "127.0.0.1".equals(dbHost) || "31.220.88.80".equals(dbHost)) { dbHost = "internal-db"; }
            String jdbcUrl = db.getDbType().name().equalsIgnoreCase("POSTGRES") ?
                    "jdbc:postgresql://" + dbHost + ":" + db.getPort() + "/" + db.getDbName() :
                    "jdbc:mysql://" + dbHost + ":" + db.getPort() + "/" + db.getDbName();

            try (Connection conn = DriverManager.getConnection(jdbcUrl, db.getUsername(), db.getEncryptedPassword());
                 Statement stmt = conn.createStatement()) {
                
                long startTime = System.currentTimeMillis();
                boolean isResultSet = stmt.execute(query);
                long duration = System.currentTimeMillis() - startTime;
                
                response.put("blocked", false);
                response.put("message", "Consulta ejecutada exitosamente en " + duration + " ms.");
                response.put("status", HttpStatus.OK.value());
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            response.put("blocked", false);
            response.put("message", "Error de SQL: " + e.getMessage());
            response.put("status", HttpStatus.BAD_REQUEST.value());
            return ResponseEntity.badRequest().body(response);
        }
    }
}
