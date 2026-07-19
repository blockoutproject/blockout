package com.blockout.mobilegateway.shared.api.errors;

// À utiliser dans un cas de getByIds
public class InconsistentStateException extends RuntimeException {
    public InconsistentStateException(String message) {
        super(message);
    }
}