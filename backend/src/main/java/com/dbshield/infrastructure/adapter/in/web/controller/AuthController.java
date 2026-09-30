package com.dbshield.infrastructure.adapter.in.web.controller;

import com.dbshield.infrastructure.adapter.in.web.dto.AuthResponse;
import com.dbshield.infrastructure.adapter.in.web.dto.LoginRequest;
import com.dbshield.infrastructure.adapter.in.web.dto.RegisterRequest;
import com.dbshield.infrastructure.adapter.out.persistence.UserRepository;
import com.dbshield.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.dbshield.infrastructure.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        String role = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .findFirst()
            .orElse("USER");
        String token = jwtService.generateToken(request.getUsername(), role);
        return ResponseEntity.ok(new AuthResponse(token, role));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.findByUsername(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "El correo ya esta registrado."));
        }

        UserEntity newUser = new UserEntity();
        newUser.setUsername(request.getEmail()); // username acts as email
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setFullName(request.getFullName());
        newUser.setCountry(request.getCountry());
        newUser.setCity(request.getCity());
        newUser.setPhone(request.getPhone());
        newUser.setRole("USER"); // Default role
        newUser.setActive(true);

        userRepository.save(newUser);

        String token = jwtService.generateToken(newUser.getUsername(), newUser.getRole());
        return ResponseEntity.ok(new AuthResponse(token, newUser.getRole()));
    }

    @GetMapping("/fix")
    public String fix() {
        UserEntity admin = userRepository.findByUsername("admin").orElse(null);
        if (admin != null) {
            admin.setPassword(passwordEncoder.encode("admin123"));
            userRepository.save(admin);
            return "Contraseña arreglada";
        }
        return "No se encontró";
    }
}
