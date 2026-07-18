package com.blockout.matches.match.live.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.MatchStatusEnum;
import org.springframework.stereotype.Component;

@Component
public class MatchLiveLinkStatePolicy {

    public MatchLiveLinkUpsertPlan plan(MatchLiveMatchSnapshot match, boolean moderator) {
        boolean finished = match.status() == MatchStatusEnum.FINISHED;
        if (finished && !moderator) {
            return new MatchLiveLinkUpsertPlan(LiveLinkStatusEnum.PENDING, true, true, true, false);
        }
        return new MatchLiveLinkUpsertPlan(LiveLinkStatusEnum.ACTIVE, false, false, false, !finished);
    }
}
