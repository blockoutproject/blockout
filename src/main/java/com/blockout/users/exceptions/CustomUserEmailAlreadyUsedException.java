package com.blockout.users.exceptions;

public class CustomUserEmailAlreadyUsedException extends RuntimeException {
    public CustomUserEmailAlreadyUsedException(String email, String auth0Id) {
        super("User already exsits with this email " + email + " for user id " + auth0Id);
    }
}
