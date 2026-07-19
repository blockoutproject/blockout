package com.blockout.config.exceptions;

public class AppStatusNotFoundException extends RuntimeException {
    public AppStatusNotFoundException() {
        super("App status not found");
    }
}
