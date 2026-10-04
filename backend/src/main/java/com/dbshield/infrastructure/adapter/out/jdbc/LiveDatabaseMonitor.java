package com.dbshield.infrastructure.adapter.out.jdbc;
import com.dbshield.application.port.out.DamPort;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DamEvent;
import com.dbshield.domain.model.DbType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component @RequiredArgsConstructor
public class LiveDatabaseMonitor implements DamPort {
    private final SelectedDatabaseConnection connector;
    @Override
    public List<DamEvent> getActiveQueries(ClientDatabase db) {
        String sql = db.getDbType() == DbType.POSTGRES
            ? "SELECT pid AS session_id, usename, client_addr::text AS client_addr, state, query, query_start, GREATEST(0, extract(epoch from (clock_timestamp() - query_start))) AS duration FROM pg_stat_activity WHERE datname = current_database() AND state = 'active' AND pid <> pg_backend_pid()"
            : "SELECT ID AS session_id, USER AS usename, HOST AS client_addr, COMMAND AS state, INFO AS query, TIME AS duration FROM information_schema.processlist WHERE DB = DATABASE() AND ID <> CONNECTION_ID() AND COMMAND <> 'Sleep' AND INFO IS NOT NULL";
        List<DamEvent> events = new ArrayList<>();
        try (Connection connection = connector.open(db)) {
            connection.setReadOnly(true);
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setQueryTimeout(5);
                try (ResultSet rows = statement.executeQuery()) {
                    while (rows.next()) {
                        Timestamp started = db.getDbType() == DbType.POSTGRES ? rows.getTimestamp("query_start") : null;
                        events.add(DamEvent.builder().databaseId(db.getId()).sessionId(rows.getLong("session_id"))
                            .queryStartedAt(started == null ? null : started.toLocalDateTime())
                            .username(rows.getString("usename")).clientAddress(rows.getString("client_addr"))
                            .state(rows.getString("state")).query(rows.getString("query"))
                            .durationSeconds(rows.getDouble("duration")).eventTime(LocalDateTime.now()).build());
                    }
                }
            }
        } catch (SQLException error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "No se pudo leer la actividad de " + db.getDbName() + ". Verifica conexión y permisos de monitoreo. Código SQL: " + error.getSQLState());
        }
        return events;
    }
}
