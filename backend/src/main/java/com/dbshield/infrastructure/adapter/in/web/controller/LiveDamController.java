package com.dbshield.infrastructure.adapter.in.web.controller;
import com.dbshield.application.service.DatabaseAccessService;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DamEvent;
import com.dbshield.infrastructure.adapter.out.jdbc.LiveDatabaseMonitor;
import com.dbshield.infrastructure.adapter.out.jdbc.PersistentClientDatabaseAdapter;
import com.dbshield.infrastructure.adapter.out.jdbc.SelectedDatabaseConnection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.sql.*;
import java.util.*;
import java.util.regex.Pattern;

@RestController @RequestMapping("/api/v1/dam") @RequiredArgsConstructor
public class LiveDamController {
    private final DatabaseAccessService access;
    private final PersistentClientDatabaseAdapter adapter;
    private final SelectedDatabaseConnection connector;
    private final LiveDatabaseMonitor monitor;
    private static final Pattern THREATS = Pattern.compile("\\b(?:DROP|TRUNCATE)\\s+TABLE\\b|\\bOR\\s+1\\s*=\\s*1\\b|\\bUNION\\s+SELECT\\b|\\bPG_SLEEP\\s*\\(|\\bWAITFOR\\s+DELAY\\b", Pattern.CASE_INSENSITIVE);
    public record QueryRequest(@NotNull Long databaseId, @NotBlank @Size(max=20000) String query) {}
    @GetMapping("/events")
    public List<DamEvent> events(Principal user, @RequestParam Long databaseId) {
        ClientDatabase db = adapter.map(access.require(user.getName(), databaseId, true));
        return monitor.getActiveQueries(db);
    }
    @PostMapping("/execute")
    public ResponseEntity<Map<String, Object>> execute(Principal user, @Valid @RequestBody QueryRequest request) {
        ClientDatabase db = adapter.map(access.require(user.getName(), request.databaseId(), true));
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("databaseId", db.getId()); response.put("databaseName", db.getDbName());
        String query = request.query().trim().replaceFirst(";\\s*$", "");
        if (THREATS.matcher(query).find()) {
            response.put("blocked", true); response.put("message", "WAF bloqueó la consulta antes de ejecutarla.");
            return ResponseEntity.status(406).body(response);
        }
        if (!query.matches("(?is)^SELECT\\s+.*") || query.contains(";")) {
            response.put("blocked", true); response.put("message", "El monitor permite una sola consulta SELECT de solo lectura.");
            return ResponseEntity.status(406).body(response);
        }
        try (Connection connection = connector.open(db)) {
            connection.setReadOnly(true);
            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                statement.setQueryTimeout(10); statement.setMaxRows(50);
                long start = System.nanoTime();
                List<String> columns = new ArrayList<>(); List<List<Object>> rows = new ArrayList<>();
                try (ResultSet set = statement.executeQuery(query)) {
                    ResultSetMetaData metadata = set.getMetaData();
                    for (int i = 1; i <= metadata.getColumnCount(); i++) columns.add(metadata.getColumnLabel(i));
                    while (set.next()) {
                        List<Object> row = new ArrayList<>();
                        for (int i = 1; i <= metadata.getColumnCount(); i++) row.add(set.getString(i));
                        rows.add(row);
                    }
                }
                double duration = (System.nanoTime() - start) / 1_000_000_000.0;
                connection.rollback();
                response.put("columns", columns); response.put("rows", rows);
                response.put("durationSeconds", duration); response.put("blocked", false);
                response.put("message", "Consulta ejecutada en " + db.getDbName() + " (" + Math.round(duration * 1000) + " ms).");
                return ResponseEntity.ok(response);
            }
        } catch (SQLException error) {
            if ("42501".equals(error.getSQLState()) && error.getMessage() != null && error.getMessage().contains("DB-Shield bloqueó")) {
                response.put("blocked", true); response.put("message", "El proxy DB-Shield bloqueó la consulta antes de enviarla a PostgreSQL.");
                return ResponseEntity.status(406).body(response);
            }
            response.put("blocked", false); response.put("message", "La consulta falló en " + db.getDbName() + ". Código SQL: " + error.getSQLState());
            return ResponseEntity.badRequest().body(response);
        }
    }
}
