package com.blockout.mobilegateway.exceptions;

// À utiliser dans un cas de getByIds
public class InconsistentStateException extends RuntimeException {
    public InconsistentStateException(String message) {
        super(message);
    }
}