package com.blockout.users.user.application;

import com.blockout.users.user.application.commands.UpdateUserCommand;
import com.blockout.users.user.application.views.UserView;

public interface UserService {

    UserView getUserByAuth0Id(String auth0Id);

    UserView updateUser(String auth0Id, UpdateUserCommand command);

    UserView ensureCurrentUser(String auth0Id);

    void deleteUser(String auth0Id);

    void assignDefaultRole(String auth0Id);
}
