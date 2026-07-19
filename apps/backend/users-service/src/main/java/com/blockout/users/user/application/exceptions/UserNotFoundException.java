package com.blockout.users.user.application.exceptions;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(String id) {
        super("User not found with id " + id);
    }
}
