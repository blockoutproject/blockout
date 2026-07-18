package com.blockout.matches.services.moderation;

import com.blockout.matches.match.persistence.Match;
import com.blockout.matches.models.enums.MatchStatus;
import org.springframework.stereotype.Component;

@Component
public class MatchLiveLinkModerationPolicy {

    private static final int AUTO_HIDE_THRESHOLD = 3;
    private static final int FINAL_AUTO_HIDE_THRESHOLD = 10;

    public int determineAutoHideThreshold(Match match) {
        if (match != null && match.getStatus() == MatchStatus.FINISHED) {
            return FINAL_AUTO_HIDE_THRESHOLD;
        }
        return AUTO_HIDE_THRESHOLD;
    }
}
