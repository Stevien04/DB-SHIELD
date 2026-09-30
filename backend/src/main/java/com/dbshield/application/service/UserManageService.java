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
        entity.setRole(user.getRole().name());
        userRepository.save(entity);
        return user;
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
