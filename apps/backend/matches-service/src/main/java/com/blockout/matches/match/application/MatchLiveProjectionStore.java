package com.blockout.matches.match.application;

import java.util.List;
import java.util.Optional;

public interface MatchLiveProjectionStore {

    Optional<MatchLiveProjection> findNewestActive(Long matchId);

    List<MatchLiveProjection> findActiveByMatchIds(List<Long> matchIds);
}
