package com.dbshield.application.service;

import com.dbshield.application.port.in.UserManageUseCase;
import com.dbshield.domain.model.User;
import com.dbshield.infrastructure.adapter.out.persistence.UserRepository;
import com.dbshield.infrastructure.adapter.out.persistence.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserManageService implements UserManageUseCase {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public User createUser(User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username ya existe");
        }
        UserEntity entity = new UserEntity();
        entity.setUsername(user.getUsername());
        entity.setPassword(passwordEncoder.encode(user.getPassword()));
        entity.setRole(user.getRole().name());
        entity.setActive(true);
        if (user.getFullName() != null) entity.setFullName(user.getFullName());
        if (user.getCountry() != null) entity.setCountry(user.getCountry());
        if (user.getCity() != null) entity.setCity(user.getCity());
        if (user.getPhone() != null) entity.setPhone(user.getPhone());
        
        entity = userRepository.save(entity);
        user.setId(entity.getId());
        return user;
    }

    @Override
    @Transactional
    public User updateUser(Long id, User user) {
        UserEntity entity = userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            entity.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        if (user.getRole() != null) {
            entity.setRole(user.getRole().name());
        }
        entity.setActive(user.isActive());
        if (!user.isActive()) {
            if (user.getBanReason() != null) entity.setBanReason(user.getBanReason());
            if (entity.getBannedAt() == null) entity.setBannedAt(java.time.LocalDateTime.now());
        } else {
            entity.setBanReason(null);
            entity.setBannedAt(null);
        }
        if (user.getFullName() != null) entity.setFullName(user.getFullName());
        if (user.getCountry() != null) entity.setCountry(user.getCountry());
        if (user.getCity() != null) entity.setCity(user.getCity());
        if (user.getPhone() != null) entity.setPhone(user.getPhone());
        entity = userRepository.save(entity);
        
        return User.builder()
            .id(entity.getId())
            .username(entity.getUsername())
            .role(com.dbshield.domain.model.Role.valueOf(entity.getRole()))
            .isActive(entity.isActive())
            .fullName(entity.getFullName())
            .country(entity.getCountry())
            .city(entity.getCity())
            .phone(entity.getPhone())
            .banReason(entity.getBanReason())
            .bannedAt(entity.getBannedAt())
            .build();
    }

    @Override
    @Transactional
    public void deactivateUser(Long id) {
        UserEntity entity = userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        entity.setActive(false);
        userRepository.save(entity);
    }

    @Override
    public List<User> listAllUsers() {
        return userRepository.findAll().stream().map(e -> 
            User.builder()
                .id(e.getId())
                .username(e.getUsername())
                .role(com.dbshield.domain.model.Role.valueOf(e.getRole()))
                .isActive(e.isActive())
                .fullName(e.getFullName())
                .country(e.getCountry())
                .city(e.getCity())
                .phone(e.getPhone())
                .banReason(e.getBanReason())
                .bannedAt(e.getBannedAt())
                .build()
        ).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void assignDatabasesToUser(Long userId, List<Long> databaseIds) {
        // Por implementar cuando se conecte ClientDatabaseEntity
        // Esto requerirá una tabla intermedia user_databases en JPA
    }
}
