package com.dbshield.application.port.in;

import com.dbshield.domain.model.Threat;
import java.util.List;

public interface ThreatManageUseCase {
    List<Threat> listThreats(String username);
    void restoreThreat(String username, Long clientDbId, String pkValue);
    void purgeThreat(String username, Long clientDbId, String pkValue);
}
