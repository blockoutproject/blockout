package com.blockout.mobilegateway.config.application.commands;

/** Values accepted when creating or updating a Division. */
public record UpsertDivisionCommand(
        String name,
        String mainColor,
        String firstGradientColor,
        String secondGradientColor,
        String thirdGradientColor) {
}
