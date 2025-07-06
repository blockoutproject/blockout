package com.blockout.mobilegateway.exceptions;

public class TeamNotFoundException extends RuntimeException {
    public TeamNotFoundException(Long id) {
        super("Team not found with id " + id);
    }
}
