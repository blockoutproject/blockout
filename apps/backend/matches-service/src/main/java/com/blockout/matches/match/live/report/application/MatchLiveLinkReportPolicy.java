package com.blockout.matches.match.live.report.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.MatchStatusEnum;
import org.springframework.stereotype.Component;

@Component
public class MatchLiveLinkReportPolicy {

    private static final int AUTO_HIDE_THRESHOLD = 3;
    private static final int FINAL_AUTO_HIDE_THRESHOLD = 10;

    public int autoHideThreshold(MatchStatusEnum matchStatus) {
        return matchStatus == MatchStatusEnum.FINISHED ? FINAL_AUTO_HIDE_THRESHOLD : AUTO_HIDE_THRESHOLD;
    }

    public LiveLinkStatusEnum statusAfterReport(
            LiveLinkStatusEnum currentStatus,
            long reportCount,
            int threshold) {
        if (reportCount >= threshold && currentStatus == LiveLinkStatusEnum.ACTIVE) {
            return LiveLinkStatusEnum.BANNED;
        }
        return currentStatus;
    }
}
