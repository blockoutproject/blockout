package com.blockout.matches.match.application;

import com.blockout.matches.match.application.commands.SetMatchLiveLinkCommand;
import com.blockout.matches.match.application.views.MatchLiveLinkResult;
import com.blockout.matches.match.application.views.MatchLiveLinkView;

import java.util.List;

public interface MatchLiveLinkService {
    MatchLiveLinkResult upsertLiveLink(Long matchId, SetMatchLiveLinkCommand command);

    void deleteLiveLink(Long matchId, String auth0Id);

    List<MatchLiveLinkView> getLiveLinksHistoryForMatch(Long matchId);

    void approvePendingLink(Long liveLinkId);

    void rejectPendingLink(Long liveLinkId);

    void reactivateLiveLink(Long liveLinkId);
}
