package com.dbshield.application.port.in;
import com.dbshield.domain.model.DamEvent;
import java.util.List;
public interface DamUseCase {
    List<DamEvent> getLiveEvents(String username, Long databaseId);
}
