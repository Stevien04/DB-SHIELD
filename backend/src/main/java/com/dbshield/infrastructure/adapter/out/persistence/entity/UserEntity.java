package com.dbshield.infrastructure.adapter.out.persistence.entity;
import jakarta.persistence.*;
import lombok.Data;
@Data @Entity @Table(name = "users")
public class UserEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String username;
    @Column(nullable = false)
    private String password;
    
    @Column(name = "full_name")
    private String fullName;
    private String country;
    private String city;
    private String phone;

    @Column(nullable = false)
    private String role;
    @Column(nullable = false)
    private boolean isActive = true;
}
