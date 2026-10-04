package com.dbshield.application.service;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.security.*;
import java.nio.charset.StandardCharsets;
@Service @RequiredArgsConstructor
public class IntegrationKeyService {
    private final JdbcTemplate jdbc;
    private final DatabaseAccessService access;
    public record Grant(long id, String owner, long databaseId, boolean writes) {}
    public static String fingerprint(String key) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception error) { throw new IllegalStateException(error); }
    }
    public Map<String,Object> create(String owner, long databaseId, String name, boolean writes) {
        access.require(owner, databaseId, true);
        byte[] random = new byte[32]; new SecureRandom().nextBytes(random);
        String key = "dbs_" + Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        Long id = jdbc.queryForObject("INSERT INTO sistema.claves_api(propietario,conexion_id,nombre,huella,prefijo,permite_escritura) VALUES (?,?,?,?,?,?) RETURNING id", Long.class, owner,databaseId,name,fingerprint(key),key.substring(0,12),writes);
        return Map.of("id",id,"key",key,"message","Guarda esta clave. Solo se muestra una vez; vence en 30 días.");
    }
    public List<Map<String,Object>> list(String owner, long databaseId) {
        access.require(owner,databaseId,false);
        return jdbc.queryForList("SELECT id,nombre,prefijo,permite_escritura,activa,creada,vence FROM sistema.claves_api WHERE propietario=? AND conexion_id=? ORDER BY id DESC",owner,databaseId);
    }
    public void revoke(String owner, long id) {
        if (jdbc.update("UPDATE sistema.claves_api SET activa=false WHERE id=? AND propietario=?",id,owner)!=1) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Clave no encontrada.");
    }
    public Grant authenticate(String key, long databaseId) {
        if (key==null || !key.matches("dbs_[A-Za-z0-9_-]{43}")) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Clave de API inválida.");
        var grants=jdbc.query("SELECT k.id,k.propietario,k.conexion_id,k.permite_escritura FROM sistema.claves_api k JOIN public.users u ON u.username=k.propietario WHERE k.huella=? AND k.activa=true AND k.vence>CURRENT_TIMESTAMP AND u.is_active=true",
            (rs,row)->new Grant(rs.getLong(1),rs.getString(2),rs.getLong(3),rs.getBoolean(4)),fingerprint(key));
        if (grants.size()!=1) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Clave de API inválida o vencida.");
        Grant grant=grants.getFirst();
        if (grant.databaseId()!=databaseId) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Esta clave no tiene acceso a esa base.");
        access.require(grant.owner(),databaseId,true);
        return grant;
    }
}
