package com.blockout.workersearch.configuration.division.application;

public record DivisionSnapshot(
        Long id,
        String name,
        String mainColor,
        String firstGradientColor,
        String secondGradientColor,
        String thirdGradientColor,
        String logoUrl,
        Boolean active,
        long revision) {
}
