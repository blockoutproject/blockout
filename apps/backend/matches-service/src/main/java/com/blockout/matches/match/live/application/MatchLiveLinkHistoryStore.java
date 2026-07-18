package com.blockout.matches.match.live.application;

import java.util.List;

public interface MatchLiveLinkHistoryStore {

    MatchLiveLinkStatePage findHistory(Long matchId, int page, int pageSize);

    List<MatchLiveLinkSnapshot> findAllHistory(Long matchId);
}
