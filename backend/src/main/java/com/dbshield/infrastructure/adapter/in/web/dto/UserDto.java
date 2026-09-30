package com.dbshield.infrastructure.adapter.in.web.dto;
import com.dbshield.domain.model.Role;
import lombok.Builder;
import lombok.Data;
@Data @Builder
public class UserDto {
    private Long id;
    private String username;
    private Role role;
    private boolean isActive;
}
