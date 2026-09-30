package com.dbshield.infrastructure.adapter.in.web.controller;

import com.dbshield.application.port.in.UserManageUseCase;
import com.dbshield.domain.model.User;
import com.dbshield.infrastructure.adapter.in.web.dto.CreateUserRequest;
import com.dbshield.infrastructure.adapter.in.web.dto.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserManageUseCase userManageUseCase;

    // RW-02: Gestin de usuarios (solo DBA)
    @GetMapping
    public ResponseEntity<List<UserDto>> listUsers() {
        List<UserDto> users = userManageUseCase.listAllUsers().stream()
            .map(u -> UserDto.builder()
                .id(u.getId())
                .username(u.getUsername())
                .role(u.getRole())
                .isActive(u.isActive())
                .build())
            .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PreAuthorize("hasRole('ADMIN_DBA')")
    @PostMapping
    public ResponseEntity<UserDto> createUser(@RequestBody CreateUserRequest request) {
        User user = User.builder()
            .username(request.getUsername())
            .password(request.getPassword())
            .role(request.getRole())
            .build();
        
        user = userManageUseCase.createUser(user);
        
        return ResponseEntity.ok(UserDto.builder()
            .id(user.getId())
            .username(user.getUsername())
            .role(user.getRole())
            .isActive(true)
            .build());
    }

    @PreAuthorize("hasRole('ADMIN_DBA')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateUser(@PathVariable Long id) {
        userManageUseCase.deactivateUser(id);
        return ResponseEntity.noContent().build();
    }
}
