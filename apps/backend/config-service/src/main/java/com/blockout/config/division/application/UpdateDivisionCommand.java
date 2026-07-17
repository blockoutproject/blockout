package com.blockout.config.division.application;

public record UpdateDivisionCommand(
        String name,
        String mainColor,
        String firstGradientColor,
        String secondGradientColor,
        String thirdGradientColor) {
}
