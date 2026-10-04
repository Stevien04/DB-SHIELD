package com.dbshield.infrastructure.adapter.in.web.controller;
import com.dbshield.application.service.*;
import com.dbshield.infrastructure.adapter.out.jdbc.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.sql.*;
import java.util.*;
import java.util.concurrent.Semaphore;
@RestController @RequestMapping("/api/v1/integration") @RequiredArgsConstructor
public class IntegrationApiController {
    private final IntegrationKeyService keys;
    private final DatabaseAccessService access;
    private final PersistentClientDatabaseAdapter adapter;
    private final SelectedDatabaseConnection connector;
    private final ProxyProtectionController protection;
    private final Semaphore capacity = new Semaphore(10);
    public record KeyRequest(@NotNull Long databaseId,@NotBlank @Size(max=100) String name,boolean allowWrites) {}
    public record QueryRequest(@NotNull Long databaseId,@NotBlank @Size(max=20000) String query,@Size(max=100) List<Object> parameters) {}
    @PostMapping("/keys") public Map<String,Object> create(Principal user,@Valid @RequestBody KeyRequest req) { return keys.create(user.getName(),req.databaseId(),req.name(),req.allowWrites()); }
    @GetMapping("/keys") public List<Map<String,Object>> list(Principal user,@RequestParam long databaseId) { return keys.list(user.getName(),databaseId); }
    @DeleteMapping("/keys/{id}") public Map<String,Object> revoke(Principal user,@PathVariable long id) { keys.revoke(user.getName(),id); return Map.of("message","Clave revocada."); }
    @PostMapping("/query") public ResponseEntity<?> execute(@RequestHeader(value="X-API-Key",required=false) String key,@Valid @RequestBody QueryRequest req) {
        var grant=keys.authenticate(key,req.databaseId());
        if (!Boolean.TRUE.equals(protection.protection(()->grant.owner(),req.databaseId()).get("enabled"))) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Habilita el proxy de esta base. La API no ejecuta consultas sin inspección activa.");
        String sql=req.query().trim().replaceFirst(";\\s*$","");
        // Una transacción por solicitud. No se admiten scripts ni comandos administrativos.
        if (sql.contains(";") || !sql.matches("(?is)^(SELECT|INSERT|UPDATE|DELETE)\\s+.*")) return ResponseEntity.status(406).body(Map.of("blocked",true,"message","Envía una sola consulta SELECT, INSERT, UPDATE o DELETE."));
        boolean read=sql.matches("(?is)^SELECT\\s+.*");
        if (!read && !grant.writes()) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Esta clave solo permite lectura.");
        List<Object> params=req.parameters()==null?List.of():req.parameters();
        for (Object value:params) if (value!=null && !(value instanceof String || value instanceof Number || value instanceof Boolean)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Los parámetros deben ser valores simples o null.");
        if (!capacity.tryAcquire()) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"La API está ocupada. Reintenta más tarde.");
        try (var connection=connector.open(adapter.map(access.require(grant.owner(),req.databaseId(),true)))) {
            connection.setReadOnly(read); connection.setAutoCommit(false);
            try (var limits=connection.createStatement()) {
                limits.execute("SET LOCAL statement_timeout = 10000");
            }
            try (var limits=connection.createStatement()) {
                limits.execute("SET LOCAL statement_timeout = 10000");
            }
            try (var statement=connection.prepareStatement(sql)) {
                statement.setQueryTimeout(10); statement.setMaxRows(101);
                for (int i=0;i<params.size();i++) statement.setObject(i+1,params.get(i));
                long start=System.nanoTime();
                boolean hasRows=statement.execute();
                List<String> columns=new ArrayList<>(); List<List<Object>> rows=new ArrayList<>();
                boolean truncated=false;
                int resultCharacters=0;
                if (hasRows) try (var rs=statement.getResultSet()) {
                    var meta=rs.getMetaData();
                    for (int i=1;i<=meta.getColumnCount();i++) columns.add(meta.getColumnLabel(i));
                    while (rs.next()) {
                        if (rows.size()==100) { truncated=true; break; }
                        List<Object> row=new ArrayList<>();
                        for (int i=1;i<=meta.getColumnCount();i++) {
                            String value=rs.getString(i);
                            resultCharacters+=value==null?0:value.length();
                            if (resultCharacters>250000) throw new SQLException("Resultado demasiado grande","54000");
                            row.add(value);
                        }
                        rows.add(row);
                    }
                }
                int affected=hasRows?0:Math.max(0,statement.getUpdateCount());
                if (read) connection.rollback(); else connection.commit();
                return ResponseEntity.ok(Map.of("databaseId",req.databaseId(),"blocked",false,"columns",columns,"rows",rows,"affectedRows",affected,"truncated",truncated,"durationMs",(System.nanoTime()-start)/1000000));
            } catch (SQLException error) { connection.rollback(); throw error; }
        } catch (SQLException error) {
            boolean blocked="42501".equals(error.getSQLState()) && error.getMessage()!=null && error.getMessage().contains("DB-Shield bloqueó");
            return ResponseEntity.status(blocked?406:400).body(Map.of("blocked",blocked,"sqlState",error.getSQLState()==null?"unknown":error.getSQLState(),"message",blocked?"DB-Shield bloqueó la consulta antes de enviarla a la base.":"No se pudo ejecutar la consulta. Verifica SQL, parámetros y conexión."));
        } finally { capacity.release(); }
    }
}
