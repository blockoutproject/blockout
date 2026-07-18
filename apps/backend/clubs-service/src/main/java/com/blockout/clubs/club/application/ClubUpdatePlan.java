package com.blockout.clubs.club.application;

public record ClubUpdatePlan(
        UpdateClubCommand command,
        String replacementLogoUrl,
        boolean replaceLogo,
        boolean active) {
}
