package com.dbshield.infrastructure.adapter.in.web.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
@Data @AllArgsConstructor
public class AuthResponse {
    private String token;
    private String role;
}
