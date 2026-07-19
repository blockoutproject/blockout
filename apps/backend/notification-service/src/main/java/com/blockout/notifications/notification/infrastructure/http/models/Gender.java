package com.blockout.notifications.notification.infrastructure.http.models;

public enum Gender {
    M("Masculin"),
    F("Féminin"),
    O("Mixte / Autre");

    private final String label;

    Gender(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
