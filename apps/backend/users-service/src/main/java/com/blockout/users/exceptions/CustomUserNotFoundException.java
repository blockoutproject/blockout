package com.blockout.users.exceptions;

public class CustomUserNotFoundException extends RuntimeException {
    public CustomUserNotFoundException(String auth0Id) {
        super("User not found with id " + auth0Id);
    }
}
