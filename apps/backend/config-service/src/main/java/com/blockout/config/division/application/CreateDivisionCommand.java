package com.blockout.config.division.application;

public record CreateDivisionCommand(
        String name,
        String mainColor,
        String firstGradientColor,
        String secondGradientColor,
        String thirdGradientColor) {
}
