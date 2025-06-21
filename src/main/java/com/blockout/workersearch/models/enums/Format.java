package com.blockout.workersearch.models.enums;

public enum Format {
    SIX("6x6"),
    FOUR("4x4");

    private final String label;

    Format(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}