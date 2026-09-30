package com.dbshield.infrastructure.adapter.out.jdbc;

import com.dbshield.application.port.out.ClientDatabasePort;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DbType;
import com.dbshield.domain.model.Threat;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class DynamicJdbcAdapter implements ClientDatabasePort {

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
            config.setMaximumPoolSize(5);
            config.setConnectionTimeout(3000);
            return new HikariDataSource(config);
        });
    }

    @Override
    public List<String> extractTables(ClientDatabase db) {
        List<String> tables = new ArrayList<>();
        try (Connection conn = getDataSource(db).getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            String schema = db.getDbType() == DbType.POSTGRES ? "public" : null;
            try (ResultSet rs = metaData.getTables(null, schema, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    tables.add(rs.getString("TABLE_NAME"));
                }
            }
        } catch (Exception e) {
            log.error("Error extrayendo tablas", e);
        }
        return tables;
    }

    @Override
    public Map<String, String> extractColumnsWithTypes(ClientDatabase db, String tableName) {
        Map<String, String> columns = new HashMap<>();
        try (Connection conn = getDataSource(db).getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            String schema = db.getDbType() == DbType.POSTGRES ? "public" : null;
            try (ResultSet rs = metaData.getColumns(null, schema, tableName, "%")) {
                while (rs.next()) {
                    columns.put(rs.getString("COLUMN_NAME"), rs.getString("TYPE_NAME"));
                }
            }
        } catch (Exception e) {
            log.error("Error extrayendo columnas", e);
        }
        return columns;
    }

    @Override
    public void quarantineRecord(ClientDatabase db, String tableName, String pkColumn, String flagColumn, String pkValue) {
        String query = String.format("UPDATE %s SET %s = TRUE WHERE %s = ?", tableName, flagColumn, pkColumn);
        executeUpdate(db, query, pkValue);
    }

    @Override
    public void restoreRecord(ClientDatabase db, String tableName, String pkColumn, String flagColumn, String pkValue) {
        String query = String.format("UPDATE %s SET %s = FALSE WHERE %s = ?", tableName, flagColumn, pkColumn);
        executeUpdate(db, query, pkValue);
    }

    @Override
    public void deleteRecord(ClientDatabase db, String tableName, String pkColumn, String pkValue) {
        String query = String.format("DELETE FROM %s WHERE %s = ?", tableName, pkColumn);
        executeUpdate(db, query, pkValue);
    }

    private void executeUpdate(ClientDatabase db, String sql, String pkValue) {
        try (Connection conn = getDataSource(db).getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, pkValue);
            ps.executeUpdate();
        } catch (Exception e) {
            log.error("Error ejecutando update JDBC", e);
            throw new RuntimeException(e);
        }
    }

    @Override
    public List<Threat> findQuarantinedRecords(ClientDatabase db) {
        List<Threat> threats = new ArrayList<>();
        if (db.getQuarantineTable() == null || db.getQuarantineFlagColumn() == null) return threats;
        
        String sql = String.format("SELECT %s FROM %s WHERE %s = TRUE", 
            db.getQuarantinePkColumn(), db.getQuarantineTable(), db.getQuarantineFlagColumn());
            
        try (Connection conn = getDataSource(db).getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                threats.add(Threat.builder()
                    .clientDatabaseId(db.getId())
                    .tableName(db.getQuarantineTable())
                    .recordPk(rs.getString(1))
                    .isQuarantined(true)
                    .detectedAt(LocalDateTime.now()) // Estimado en vivo
                    .build());
            }
        } catch (Exception e) {
            log.error("Error consultando cuarentena en vivo", e);
        }
        return threats;
    }
}
