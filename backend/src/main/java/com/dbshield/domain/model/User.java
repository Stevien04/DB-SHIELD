package com.dbshield.domain.model;
import lombok.Builder;
import lombok.Data;
@Data @Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
public class User {
    private Long id;
    private String username;
    private String password;
    private Role role;
    private boolean isActive;
    private String fullName;
    private String country;
    private String city;
    private String phone;
    private String banReason;
    private java.time.LocalDateTime bannedAt;
}
