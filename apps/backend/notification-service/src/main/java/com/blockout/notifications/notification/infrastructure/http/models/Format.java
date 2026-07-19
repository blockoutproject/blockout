package com.blockout.notifications.notification.infrastructure.http.models;

public enum Format {
    SIX("6x6"),
    FOUR("4x4"),
    TWO("2x2");

    private final String label;

    Format(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
