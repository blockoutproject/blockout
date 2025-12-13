package com.blockout.users.exceptions;

public class CustomUserEmailAlreadyUsedException extends RuntimeException {
    public CustomUserEmailAlreadyUsedException(String email) {
        super("L'email avec laquelle vous essayez de vous enregistrer (" + email + ") est déjà rattachée à un compte.");
    }
}
