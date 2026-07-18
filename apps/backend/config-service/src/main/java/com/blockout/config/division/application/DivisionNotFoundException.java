package com.blockout.config.division.application;

public class DivisionNotFoundException extends RuntimeException {

    public DivisionNotFoundException(Long id) {
        super("Division not found with ID: " + id);
    }
}
