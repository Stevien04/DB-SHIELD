package com.dbshield.application.port.in;

import com.dbshield.domain.model.User;
import java.util.List;

public interface UserManageUseCase {
    User createUser(User user);
    User updateUser(Long id, User user);
    void deactivateUser(Long id);
    List<User> listAllUsers();
    void assignDatabasesToUser(Long userId, List<Long> databaseIds);
}
