package com.blockout.config.shared.application;

/** Identifies a missing configuration resource with a stable API error code. */
public class ConfigResourceNotFoundException extends RuntimeException {

    private final String code;

    /** Creates the error with its stable code and public detail. */
    public ConfigResourceNotFoundException(String code, String message) {
        super(message);
        this.code = code;
    }

    /** Returns the stable machine-readable API error code. */
    public String getCode() {
        return code;
    }
}
