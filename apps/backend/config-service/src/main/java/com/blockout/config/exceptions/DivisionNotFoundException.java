package com.blockout.config.exceptions;

public class DivisionNotFoundException extends RuntimeException {
    public DivisionNotFoundException(Long id) {
        super("Division not found with ID: " + id);
    }
}
