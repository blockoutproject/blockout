package com.blockout.matches.match.live.moderation.persistence;

import com.blockout.matches.match.live.moderation.application.MatchLiveModerationLinkSnapshot;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationMatchSnapshot;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationStore;
import com.blockout.matches.match.live.persistence.MatchLiveLink;
import com.blockout.matches.match.live.persistence.MatchLiveLinkRepository;
import com.blockout.matches.match.persistence.Match;
import com.blockout.matches.match.persistence.MatchRepository;
import com.blockout.shared.model.LiveLinkStatusEnum;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaMatchLiveModerationStore implements MatchLiveModerationStore {

    private final MatchRepository matches;
    private final MatchLiveLinkRepository liveLinks;
    private final MatchLiveModerationPersistenceMapper mapper;

    @Override
    public List<MatchLiveModerationMatchSnapshot> findAllWithLiveLinks() {
        return matches.findAllWithLiveLinks().stream().map(mapper::toSnapshot).toList();
    }

    @Override
    public Optional<MatchLiveModerationLinkSnapshot> findById(Long liveLinkId) {
        return liveLinks.findById(liveLinkId).map(mapper::toSnapshot);
    }

    @Override
    public Optional<MatchLiveModerationLinkSnapshot> findNewestActive(Long matchId) {
        return liveLinks.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatusEnum.ACTIVE)
                .map(mapper::toSnapshot);
    }

    @Override
    public void changeStatus(Long liveLinkId, LiveLinkStatusEnum status, Instant now) {
        MatchLiveLink link = liveLinks.getReferenceById(liveLinkId);
        link.setStatus(LiveLinkStatusEnum.valueOf(status.getValue()));
        link.setLastUpdate(now);
        liveLinks.save(link);
    }

    @Override
    public void touchMatch(Long matchId, Instant now) {
        Match match = matches.getReferenceById(matchId);
        match.setLastUpdate(now);
        matches.save(match);
    }
}
