package com.dbshield.infrastructure.adapter.in.web.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String fullName;
    private String country;
    private String city;
    private String phone;
}
