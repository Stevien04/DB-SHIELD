package com.dbshield.infrastructure.adapter.out.jdbc;

import com.dbshield.application.port.out.DamPort;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DamEvent;
import com.dbshield.domain.model.DbType;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class DynamicDamAdapter implements DamPort {

    private final Map<Long, HikariDataSource> dataSources = new ConcurrentHashMap<>();

    private HikariDataSource getDataSource(ClientDatabase db) {
        return dataSources.computeIfAbsent(db.getId(), id -> {
            HikariConfig config = new HikariConfig();
            String url = db.getDbType() == DbType.POSTGRES 
                ? "jdbc:postgresql://" + db.getHost() + ":" + db.getPort() + "/" + db.getDbName()
                : "jdbc:mysql://" + db.getHost() + ":" + db.getPort() + "/" + db.getDbName();
            
            config.setJdbcUrl(url);
            config.setUsername(db.getUsername());
            config.setPassword(db.getEncryptedPassword());
            config.setMaximumPoolSize(3);
            return new HikariDataSource(config);
        });
    }

    @Override
    public List<DamEvent> getActiveQueries(ClientDatabase db) {
        List<DamEvent> events = new ArrayList<>();
        // RA-07: Consultar catlogos del sistema
        String sql = db.getDbType() == DbType.POSTGRES ?
            "SELECT usename, client_addr, state, query, extract(epoch from (now() - query_start)) as duration FROM pg_stat_activity WHERE state = 'active' AND pid <> pg_backend_pid()" :
            "SELECT USER as usename, HOST as client_addr, COMMAND as state, INFO as query, TIME as duration FROM information_schema.processlist WHERE COMMAND != 'Sleep'";

        try (Connection conn = getDataSource(db).getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            
            while (rs.next()) {
                events.add(DamEvent.builder()
                    .databaseId(db.getId())
                    .username(rs.getString("usename"))
                    .clientAddress(rs.getString("client_addr"))
                    .state(rs.getString("state"))
                    .query(rs.getString("query"))
                    .durationSeconds(rs.getDouble("duration"))
                    .eventTime(LocalDateTime.now())
                    .build());
            }
        } catch (Exception e) {
            log.error("Error monitorizando DAM en la DB cliente {}", db.getName(), e);
        }
        return events;
    }
}
