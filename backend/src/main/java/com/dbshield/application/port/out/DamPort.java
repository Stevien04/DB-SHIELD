package com.dbshield.application.port.out;
import com.dbshield.domain.model.ClientDatabase;
import com.dbshield.domain.model.DamEvent;
import java.util.List;
public interface DamPort {
    List<DamEvent> getActiveQueries(ClientDatabase db);
}
