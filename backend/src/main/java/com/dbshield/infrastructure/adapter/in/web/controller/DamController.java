package com.dbshield.infrastructure.adapter.in.web.controller;

import com.dbshield.application.port.in.DamUseCase;
import com.dbshield.domain.model.DamEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dam")
@RequiredArgsConstructor
public class DamController {

    private final DamUseCase damUseCase;

    // RW-07: Visor de Eventos DAM
    @GetMapping("/events")
    public ResponseEntity<List<DamEvent>> getEvents(Principal principal, @RequestParam Long databaseId) {
        return ResponseEntity.ok(damUseCase.getLiveEvents(principal.getName(), databaseId));
    }
}
