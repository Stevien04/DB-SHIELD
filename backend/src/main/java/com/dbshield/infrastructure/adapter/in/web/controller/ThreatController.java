package com.dbshield.infrastructure.adapter.in.web.controller;

import com.dbshield.application.port.in.ThreatManageUseCase;
import com.dbshield.domain.model.Threat;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/threats")
@RequiredArgsConstructor
public class ThreatController {

    private final ThreatManageUseCase threatManageUseCase;

    // RA-08: Lista filtrada por BDs del usuario
    @GetMapping
    public ResponseEntity<List<Threat>> listThreats(Principal principal) {
        return ResponseEntity.ok(threatManageUseCase.listThreats(principal.getName()));
    }

    // RA-06: Restaurar (Solo DBA)
    @PreAuthorize("hasRole('ADMIN_DBA')")
    @PostMapping("/{clientDbId}/{pkValue}/restore")
    public ResponseEntity<Void> restoreThreat(
            Principal principal,
            @PathVariable Long clientDbId,
            @PathVariable String pkValue) {
        threatManageUseCase.restoreThreat(principal.getName(), clientDbId, pkValue);
        return ResponseEntity.ok().build();
    }

    // RA-09: Depurar (Solo DBA)
    @PreAuthorize("hasRole('ADMIN_DBA')")
    @DeleteMapping("/{clientDbId}/{pkValue}")
    public ResponseEntity<Void> purgeThreat(
            Principal principal,
            @PathVariable Long clientDbId,
            @PathVariable String pkValue) {
        threatManageUseCase.purgeThreat(principal.getName(), clientDbId, pkValue);
        return ResponseEntity.noContent().build();
    }
}
