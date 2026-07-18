package com.blockout.matches.match.live.report.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.MatchStatusEnum;

public record MatchLiveLinkReportTarget(
        Long liveLinkId,
        Long matchId,
        MatchStatusEnum matchStatus,
        LiveLinkStatusEnum status) {
}
