package com.blockout.teams.team.application;

public record TeamUpdatePlan(UpdateTeamCommand command, String replacementLogoUrl, boolean replaceLogo) {
}
