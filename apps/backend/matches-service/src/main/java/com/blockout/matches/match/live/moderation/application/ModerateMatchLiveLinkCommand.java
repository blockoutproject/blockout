package com.blockout.matches.match.live.moderation.application;

public record ModerateMatchLiveLinkCommand(
        Long liveLinkId,
        MatchLiveLinkDecision decision) {
}
