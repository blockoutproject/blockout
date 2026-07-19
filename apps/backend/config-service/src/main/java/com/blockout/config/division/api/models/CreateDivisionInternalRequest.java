package com.blockout.config.division.api.models;

/** V1 multipart JSON part used to create a division. */
public record CreateDivisionInternalRequest(
        String name,
        String mainColor,
        String firstGradientColor,
        String secondGradientColor,
        String thirdGradientColor) {
}
