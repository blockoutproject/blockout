package com.blockout.config.division.application.commands;

/**
 * Application command for partially updating a division.
 */
public record UpdateDivisionCommand(
    String name, String mainColor, String firstGradientColor, String secondGradientColor,
    String thirdGradientColor, DivisionImageCommand image) {
}
