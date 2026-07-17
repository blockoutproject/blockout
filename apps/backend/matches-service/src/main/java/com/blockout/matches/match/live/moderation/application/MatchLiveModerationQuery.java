package com.blockout.matches.match.live.moderation.application;

import com.blockout.shared.model.LiveLinkStatusEnum;

public record MatchLiveModerationQuery(
        LiveLinkStatusEnum status,
        int page,
        int pageSize) {
}
