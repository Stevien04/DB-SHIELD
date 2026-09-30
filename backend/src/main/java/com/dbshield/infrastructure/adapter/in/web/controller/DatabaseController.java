package com.dbshield.infrastructure.adapter.in.web.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/v1/databases")
@CrossOrigin("*")
public class DatabaseController {

    @PostMapping("/test")
    public ResponseEntity<Map<String, String>> testConnection(@RequestBody Map<String, String> request) {
        Map<String, String> response = new HashMap<>();
        String type = request.get("type");
        String host = request.get("host");
        String port = request.get("port");
        String name = request.get("name"); 
        String user = request.get("user");
        String pass = request.get("pass");

        String jdbcUrl = "";
        if ("PostgreSQL".equalsIgnoreCase(type)) {
            jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + name;
        } else {
            jdbcUrl = "jdbc:mysql://" + host + ":" + port + "/" + name;
        }
        
        try (Connection conn = DriverManager.getConnection(jdbcUrl, user, pass)) {
            if (conn.isValid(5)) {
                response.put("status", "success");
                response.put("message", "Conexion exitosa a " + type);
                return ResponseEntity.ok(response);
            } else {
                response.put("status", "error");
                response.put("message", "Timeout al conectar");
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Error de conexion: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}
