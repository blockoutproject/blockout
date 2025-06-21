package com.blockout.workersearch.models.enums;

public enum DivisionCode {
    MSL("Marmara SpikeLigue"),
    SP6("Saforelle Power 6"),
    LBM("Ligue B Masculine"),
    ELITE("Élite"),
    ELITEAVENIR("Élite Avenir"),
    N2("Nationale 2"),
    N3("Nationale 3"),
    PRENAT("Prénationale"),
    REG("Régionale"),
    M21("M21"),
    M18("M18"),
    M15("M15"),
    M13("M13"),
    M11("M11"),
    OTHER("Division inconnue");

    private final String label;

    DivisionCode(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}