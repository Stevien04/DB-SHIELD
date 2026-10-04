package com.dbshield.infrastructure.adapter.in.web.dto;
import com.dbshield.domain.model.Role;
import lombok.Builder;
import lombok.Data;
@Data @Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
public class UserDto {
    private Long id;
    private String username;
    private Role role;
    private boolean isActive;
    private String fullName;
    private String country;
    private String city;
    private String banReason;
    private java.time.LocalDateTime bannedAt;
    private String phone;
}
