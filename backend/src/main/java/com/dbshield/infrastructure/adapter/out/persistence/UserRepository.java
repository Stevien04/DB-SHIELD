package com.dbshield.infrastructure.adapter.out.persistence;
import com.dbshield.infrastructure.adapter.out.persistence.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByGoogleSubject(String googleSubject);
    Optional<UserEntity> findByUsername(String username);
}
