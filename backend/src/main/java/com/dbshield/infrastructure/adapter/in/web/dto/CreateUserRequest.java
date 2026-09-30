package com.dbshield.infrastructure.adapter.in.web.dto;
import com.dbshield.domain.model.Role;
import lombok.Data;
@Data
public class CreateUserRequest {
    private String username;
    private String password;
    private Role role;
}
