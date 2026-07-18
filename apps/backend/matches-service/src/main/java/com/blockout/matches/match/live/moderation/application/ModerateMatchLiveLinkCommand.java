package com.blockout.matches.match.live.moderation.application;

import com.blockout.shared.model.MatchLiveLinkDecisionEnum;
public record ModerateMatchLiveLinkCommand(
        Long liveLinkId,
        MatchLiveLinkDecisionEnum decision) {
}
