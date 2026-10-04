package com.dbshield.infrastructure.adapter.in.web.controller;

import com.dbshield.application.port.out.AuditPort;
import com.dbshield.infrastructure.adapter.in.web.dto.AuthResponse;
import com.dbshield.infrastructure.adapter.out.persistence.UserRepository;
import com.dbshield.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.dbshield.infrastructure.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth/google")
public class GoogleAuthController {
    private final String clientId;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtService tokens;
    private final AuditPort audit;
    private final NimbusJwtDecoder decoder;

    public GoogleAuthController(@Value("${GOOGLE_CLIENT_ID:}") String clientId,
            UserRepository users, PasswordEncoder passwords, JwtService tokens, AuditPort audit) {
        this.clientId = clientId;
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.audit = audit;
        this.decoder = NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build();
        this.decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("https://accounts.google.com"));
    }

    public record GoogleRequest(String credential, String password) {}

    @GetMapping("/config")
    public Map<String, Object> config() {
        return Map.of("enabled", !clientId.isBlank(), "clientId", clientId);
    }

    @PostMapping
    public ResponseEntity<?> signIn(@RequestBody GoogleRequest request) {
        if (clientId.isBlank()) return ResponseEntity.status(503).body(Map.of("message", "Google aún no está configurado."));
        if (request.credential() == null || request.credential().isBlank()) return invalidToken();
        final Jwt identity;
        try {
            identity = decoder.decode(request.credential());
        } catch (JwtException | IllegalArgumentException error) {
            return invalidToken();
        }
        String email = identity.getClaimAsString("email");
        String subject = identity.getSubject();
        if (!identity.getAudience().contains(clientId) || identity.getExpiresAt() == null
                || subject == null || subject.isBlank() || email == null || email.isBlank()
                || !Boolean.TRUE.equals(identity.getClaimAsBoolean("email_verified"))) return invalidToken();

        UserEntity user = users.findByGoogleSubject(subject).orElse(null);
        if (user == null) {
            user = users.findByUsername(email).orElse(null);
            if (user != null) {
                if (!user.isActive()) return suspended();
                if (user.getGoogleSubject() != null) return invalidToken();
                // Exigir la contraseña local para vincular una cuenta existente.
                if (request.password() == null || request.password().isBlank()) {
                    return ResponseEntity.status(409).body(Map.of("code", "LINK_PASSWORD_REQUIRED", "message", "Este correo ya tiene una cuenta. Confirma su contraseña para vincular Google."));
                }
                if (!passwords.matches(request.password(), user.getPassword())) {
                    return ResponseEntity.status(401).body(Map.of("message", "La contraseña de la cuenta no es correcta."));
                }
            } else {
                user = new UserEntity();
                user.setUsername(email);
                user.setFullName(identity.getClaimAsString("name"));
                user.setPassword(passwords.encode(UUID.randomUUID().toString()));
                user.setRole("USER");
                user.setActive(true);
            }
            user.setGoogleSubject(subject);
            users.save(user);
            audit.logAdminAction(user.getUsername(), "GOOGLE_LINK", "Cuenta vinculada con Google");
        }
        if (!user.isActive()) return suspended();
        audit.logAdminAction(user.getUsername(), "GOOGLE_LOGIN", "Inicio de sesión con Google");
        return ResponseEntity.ok(new AuthResponse(tokens.generateToken(user.getUsername(), user.getRole()), user.getRole()));
    }

    private ResponseEntity<?> invalidToken() {
        return ResponseEntity.status(401).body(Map.of("message", "No se pudo verificar tu cuenta de Google. Inténtalo de nuevo."));
    }

    private ResponseEntity<?> suspended() {
        return ResponseEntity.status(403).body(Map.of("message", "Esta cuenta está suspendida."));
    }
}
