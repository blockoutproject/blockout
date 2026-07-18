package com.blockout.config.division.application;

public record DivisionUpdatePlan(
        UpdateDivisionCommand command,
        String replacementLogoUrl,
        boolean replaceLogo,
        boolean active) {
}
