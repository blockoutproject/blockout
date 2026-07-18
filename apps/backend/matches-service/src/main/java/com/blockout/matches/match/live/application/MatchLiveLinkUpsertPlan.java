package com.blockout.matches.match.live.application;

import com.blockout.shared.model.LiveLinkStatusEnum;

public record MatchLiveLinkUpsertPlan(
        LiveLinkStatusEnum createdStatus,
        boolean postMatch,
        boolean expirePending,
        boolean touchMatch,
        boolean publishCreatedEvent) {
}
