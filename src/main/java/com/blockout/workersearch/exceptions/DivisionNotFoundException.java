package com.blockout.workersearch.exceptions;

public class DivisionNotFoundException extends RuntimeException {
    public DivisionNotFoundException(Long id) {
        super("Division not found with id " + id);
    }
}
