package com.blockout.users.user.application.exceptions;

public class UserConflictException extends RuntimeException {

    public UserConflictException(String message) {
        super(message);
    }
}
