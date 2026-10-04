package com.dbshield;

import com.dbshield.application.port.out.AuditPort;
import com.dbshield.infrastructure.adapter.in.web.controller.GoogleAuthController;
import com.dbshield.infrastructure.adapter.out.persistence.UserRepository;
import com.dbshield.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.dbshield.infrastructure.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GoogleAuthControllerTest {
    UserRepository users = mock(UserRepository.class);
    PasswordEncoder passwords = mock(PasswordEncoder.class);
    JwtService tokens = mock(JwtService.class);
    AuditPort audit = mock(AuditPort.class);
    NimbusJwtDecoder decoder = mock(NimbusJwtDecoder.class);
    GoogleAuthController controller;

    @BeforeEach void setup() {
        controller = new GoogleAuthController("client", users, passwords, tokens, audit);
        ReflectionTestUtils.setField(controller, "decoder", decoder);
        when(decoder.decode("token")).thenReturn(identity("client", true));
        when(users.findByGoogleSubject("subject")).thenReturn(Optional.empty());
        when(users.findByUsername("user@gmail.com")).thenReturn(Optional.empty());
    }

    Jwt identity(String audience, boolean verified) {
        return Jwt.withTokenValue("token").header("alg", "RS256").subject("subject")
            .claim("aud", List.of(audience)).claim("email", "user@gmail.com")
            .claim("email_verified", verified).claim("name", "Test User")
            .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(600)).build();
    }

    @Test void rejectsInvalidToken() {
        when(decoder.decode("token")).thenThrow(new JwtException("Invalid signature"));
        assertEquals(401, controller.signIn(new GoogleAuthController.GoogleRequest("token", null)).getStatusCode().value());
        verifyNoInteractions(users, tokens);
    }

    @Test void rejectsWrongAudienceAndUnverifiedEmail() {
        when(decoder.decode("token")).thenReturn(identity("other-client", true));
        assertEquals(401, controller.signIn(new GoogleAuthController.GoogleRequest("token", null)).getStatusCode().value());
        when(decoder.decode("token")).thenReturn(identity("client", false));
        assertEquals(401, controller.signIn(new GoogleAuthController.GoogleRequest("token", null)).getStatusCode().value());
        verifyNoInteractions(users, tokens);
    }

    @Test void linkingRequiresCorrectPasswordAndPreservesRole() {
        UserEntity existing = new UserEntity();
        existing.setUsername("user@gmail.com");
        existing.setPassword("hash");
        existing.setRole("ADMIN_DBA");
        when(users.findByUsername("user@gmail.com")).thenReturn(Optional.of(existing));
        assertEquals(409, controller.signIn(new GoogleAuthController.GoogleRequest("token", null)).getStatusCode().value());
        assertEquals(401, controller.signIn(new GoogleAuthController.GoogleRequest("token", "wrong")).getStatusCode().value());
        verify(users, never()).save(any());
        when(passwords.matches("correct", "hash")).thenReturn(true);
        assertEquals(200, controller.signIn(new GoogleAuthController.GoogleRequest("token", "correct")).getStatusCode().value());
        assertEquals("subject", existing.getGoogleSubject());
        assertEquals("ADMIN_DBA", existing.getRole());
    }

    @Test void rejectsSuspendedAccount() {
        UserEntity existing = new UserEntity();
        existing.setActive(false);
        when(users.findByGoogleSubject("subject")).thenReturn(Optional.of(existing));
        assertEquals(403, controller.signIn(new GoogleAuthController.GoogleRequest("token", null)).getStatusCode().value());
        verifyNoInteractions(tokens);
    }

    @Test void newAccountReceivesUserRole() {
        when(passwords.encode(anyString())).thenReturn("random-password-hash");
        assertEquals(200, controller.signIn(new GoogleAuthController.GoogleRequest("token", null)).getStatusCode().value());
        verify(users).save(argThat(user -> "USER".equals(user.getRole()) && "subject".equals(user.getGoogleSubject()) && user.isActive()));
    }

    @Test void unconfiguredGoogleIsDisabled() {
        GoogleAuthController disabled = new GoogleAuthController("", users, passwords, tokens, audit);
        assertEquals(false, disabled.config().get("enabled"));
        assertEquals(503, disabled.signIn(new GoogleAuthController.GoogleRequest("token", null)).getStatusCode().value());
    }
}
