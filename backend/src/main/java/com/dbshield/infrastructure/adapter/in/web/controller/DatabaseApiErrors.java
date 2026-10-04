package com.dbshield.infrastructure.adapter.in.web.controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.ResponseEntity;
import java.util.Map;

@RestControllerAdvice(assignableTypes = {RealDatabaseController.class, LiveDamController.class, ProxyProtectionController.class, IntegrationApiController.class})
public class DatabaseApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> expected(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("message", error.getReason() == null ? "No se pudo completar la operación." : error.getReason()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(MethodArgumentNotValidException error) {
        return ResponseEntity.badRequest().body(Map.of("message", "Verifica los campos de conexión o la consulta ingresada."));
    }
}
