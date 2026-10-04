import os

file_path = r"D:\BD II PROYECTO\backend\src\main\java\com\dbshield\infrastructure\adapter\in\web\controller\UserController.java"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
"""        User user = User.builder()
            .role(request.getRole())
            .isActive(request.isActive())
            .build();""",
"""        User user = User.builder()
            .role(request.getRole())
            .isActive(request.isActive())
            .fullName(request.getFullName())
            .country(request.getCountry())
            .city(request.getCity())
            .phone(request.getPhone())
            .build();"""
)

content = content.replace(
"""        return ResponseEntity.ok(UserDto.builder()
            .id(updated.getId())
            .username(updated.getUsername())
            .role(updated.getRole())
            .isActive(updated.isActive())
            .build());""",
"""        return ResponseEntity.ok(UserDto.builder()
            .id(updated.getId())
            .username(updated.getUsername())
            .role(updated.getRole())
            .isActive(updated.isActive())
            .fullName(updated.getFullName())
            .country(updated.getCountry())
            .city(updated.getCity())
            .phone(updated.getPhone())
            .build());"""
)

# And also for the listUsers endpoint
content = content.replace(
"""                .isActive(u.isActive())
                .build())""",
"""                .isActive(u.isActive())
                .fullName(u.getFullName())
                .country(u.getCountry())
                .city(u.getCity())
                .phone(u.getPhone())
                .build())"""
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
