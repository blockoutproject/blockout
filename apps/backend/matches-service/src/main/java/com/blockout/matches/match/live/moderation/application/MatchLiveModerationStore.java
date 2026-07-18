package com.blockout.matches.match.live.moderation.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MatchLiveModerationStore {

    List<MatchLiveModerationMatchSnapshot> findAllWithLiveLinks();

    Optional<MatchLiveModerationLinkSnapshot> findById(Long liveLinkId);

    Optional<MatchLiveModerationLinkSnapshot> findNewestActive(Long matchId);

    void changeStatus(Long liveLinkId, LiveLinkStatusEnum status, Instant now);

    void touchMatch(Long matchId, Instant now);
}
