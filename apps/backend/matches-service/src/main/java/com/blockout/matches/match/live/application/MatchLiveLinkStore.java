package com.blockout.matches.match.live.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import java.time.Instant;
import java.util.Optional;

public interface MatchLiveLinkStore {

    Optional<MatchLiveMatchSnapshot> findMatch(Long matchId);

    Optional<MatchLiveLinkSnapshot> findNewestActive(Long matchId);

    Optional<MatchLiveLinkSnapshot> findLatestByOwner(Long matchId, String ownerAuth0Id);

    long countByOwner(Long matchId, String ownerAuth0Id);

    long countDistinctMatchesByOwnerAndDay(String ownerAuth0Id, Instant start, Instant end);

    MatchLiveLinkSnapshot create(NewMatchLiveLink liveLink);

    void changeStatus(Long liveLinkId, LiveLinkStatusEnum status, Instant now);

    void changePendingByOwner(Long matchId, String ownerAuth0Id, LiveLinkStatusEnum status, Instant now);

    void touchMatch(Long matchId, Instant now);
}
