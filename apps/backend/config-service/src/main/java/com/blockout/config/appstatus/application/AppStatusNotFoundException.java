package com.blockout.config.appstatus.application;

public class AppStatusNotFoundException extends RuntimeException {

    public AppStatusNotFoundException() {
        super("App status not found");
    }
}
