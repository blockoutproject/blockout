package com.blockout.config.division.api.models;

/** V1 multipart JSON part used to update a division. */
public record UpdateDivisionInternalRequest(
        String name,
        String mainColor,
        String firstGradientColor,
        String secondGradientColor,
        String thirdGradientColor) {
}
