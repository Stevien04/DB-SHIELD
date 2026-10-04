import os

file_path = r"D:\BD II PROYECTO\backend\src\main\java\com\dbshield\application\service\UserManageService.java"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update listAllUsers
content = content.replace(
"""                .isActive(e.isActive())
                .build()""",
"""                .isActive(e.isActive())
                .fullName(e.getFullName())
                .country(e.getCountry())
                .city(e.getCity())
                .phone(e.getPhone())
                .build()"""
)

# Update createUser
content = content.replace(
"""        entity.setRole(user.getRole().name());
        entity.setActive(true);""",
"""        entity.setRole(user.getRole().name());
        entity.setActive(true);
        if (user.getFullName() != null) entity.setFullName(user.getFullName());
        if (user.getCountry() != null) entity.setCountry(user.getCountry());
        if (user.getCity() != null) entity.setCity(user.getCity());
        if (user.getPhone() != null) entity.setPhone(user.getPhone());"""
)

# Update updateUser
content = content.replace(
"""        entity.setActive(user.isActive());""",
"""        entity.setActive(user.isActive());
        if (user.getFullName() != null) entity.setFullName(user.getFullName());
        if (user.getCountry() != null) entity.setCountry(user.getCountry());
        if (user.getCity() != null) entity.setCity(user.getCity());
        if (user.getPhone() != null) entity.setPhone(user.getPhone());"""
)

# Update return builder in updateUser
content = content.replace(
"""            .role(com.dbshield.domain.model.Role.valueOf(entity.getRole()))
            .isActive(entity.isActive())
            .build();""",
"""            .role(com.dbshield.domain.model.Role.valueOf(entity.getRole()))
            .isActive(entity.isActive())
            .fullName(entity.getFullName())
            .country(entity.getCountry())
            .city(entity.getCity())
            .phone(entity.getPhone())
            .build();"""
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
