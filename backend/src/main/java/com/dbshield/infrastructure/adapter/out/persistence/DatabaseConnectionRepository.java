package com.dbshield.infrastructure.adapter.out.persistence;
import com.dbshield.infrastructure.adapter.out.persistence.entity.DatabaseConnectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface DatabaseConnectionRepository extends JpaRepository<DatabaseConnectionEntity, Long> {
    List<DatabaseConnectionEntity> findByOwner(String owner);
    Optional<DatabaseConnectionEntity> findByOwnerAndHostAndPortAndName(String owner, String host, int port, String name);
}
