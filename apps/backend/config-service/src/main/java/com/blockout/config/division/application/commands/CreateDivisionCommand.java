package com.blockout.config.division.application.commands;

/** Application command for creating a division. */
public record CreateDivisionCommand(
        String name, String mainColor, String firstGradientColor, String secondGradientColor,
        String thirdGradientColor, DivisionImageCommand image) {
}
