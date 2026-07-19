package com.blockout.users.user.application.exceptions;

public class UserEmailAlreadyUsedException extends RuntimeException {

    public UserEmailAlreadyUsedException(String email) {
        super("L'email avec laquelle vous essayez de vous connecter (" + email + ") est déjà rattachée à un compte.");
    }
}
