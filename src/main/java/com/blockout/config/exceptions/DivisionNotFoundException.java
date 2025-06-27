package com.blockout.config.exceptions;

public class DivisionNotFoundException extends EntityNotFoundException {
    public DivisionNotFoundException(Long id) {
        super("Division not found with ID: " + id);
    }
}
