package com.blockout.matches.match.live.persistence;

import com.blockout.matches.match.live.application.MatchLiveLinkHistoryStore;
import com.blockout.matches.match.live.application.MatchLiveLinkSnapshot;
import com.blockout.matches.match.live.application.MatchLiveLinkStatePage;
import com.blockout.matches.match.live.application.MatchLiveLinkStore;
import com.blockout.matches.match.live.application.MatchLiveMatchSnapshot;
import com.blockout.matches.match.live.application.NewMatchLiveLink;
import com.blockout.matches.match.persistence.Match;
import com.blockout.matches.match.persistence.MatchRepository;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaMatchLiveLinkStore implements MatchLiveLinkStore, MatchLiveLinkHistoryStore {

    private final MatchRepository matches;
    private final MatchLiveLinkRepository liveLinks;
    private final MatchLiveLinkPersistenceMapper mapper;

    @Override
    public Optional<MatchLiveMatchSnapshot> findMatch(Long matchId) {
        return matches.findById(matchId).map(this::matchSnapshot);
    }

    @Override
    public Optional<MatchLiveLinkSnapshot> findNewestActive(Long matchId) {
        return liveLinks.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatusEnum.ACTIVE)
                .map(mapper::toSnapshot);
    }

    @Override
    public Optional<MatchLiveLinkSnapshot> findLatestByOwner(Long matchId, String ownerAuth0Id) {
        return liveLinks.findFirstByMatch_IdAndOwnerAuth0IdOrderByCreatedAtDesc(matchId, ownerAuth0Id)
                .map(mapper::toSnapshot);
    }

    @Override
    public long countByOwner(Long matchId, String ownerAuth0Id) {
        return liveLinks.countByMatch_IdAndOwnerAuth0Id(matchId, ownerAuth0Id);
    }

    @Override
    public long countDistinctMatchesByOwnerAndDay(String ownerAuth0Id, Instant start, Instant end) {
        return liveLinks.countDistinctMatchesByOwnerAndDay(ownerAuth0Id, start, end);
    }

    @Override
    public MatchLiveLinkSnapshot create(NewMatchLiveLink liveLink) {
        Match match = matches.getReferenceById(liveLink.matchId());
        MatchLiveLink entity = MatchLiveLink.builder()
                .match(match)
                .ownerAuth0Id(liveLink.ownerAuth0Id())
                .provider(liveLink.provider())
                .url(liveLink.url())
                .status(liveLink.status())
                .reportCount(0)
                .createdAt(liveLink.now())
                .lastUpdate(liveLink.now())
                .build();
        return mapper.toSnapshot(liveLinks.save(entity));
    }

    @Override
    public void changeStatus(Long liveLinkId, LiveLinkStatusEnum status, Instant now) {
        MatchLiveLink link = liveLinks.getReferenceById(liveLinkId);
        link.setStatus(status);
        link.setLastUpdate(now);
        liveLinks.save(link);
    }

    @Override
    public void changePendingByOwner(
            Long matchId, String ownerAuth0Id, LiveLinkStatusEnum status, Instant now) {
        List<MatchLiveLink> pending = liveLinks.findByMatch_IdAndOwnerAuth0IdAndStatus(
                matchId, ownerAuth0Id, LiveLinkStatusEnum.PENDING);
        if (pending.isEmpty()) {
            return;
        }
        pending.forEach(link -> {
            link.setStatus(status);
            link.setLastUpdate(now);
        });
        liveLinks.saveAll(pending);
    }

    @Override
    public void touchMatch(Long matchId, Instant now) {
        Match match = matches.getReferenceById(matchId);
        match.setLastUpdate(now);
        matches.save(match);
    }

    @Override
    public MatchLiveLinkStatePage findHistory(Long matchId, int page, int pageSize) {
        Page<MatchLiveLink> result = liveLinks.findByMatch_IdOrderByCreatedAtDescIdDesc(
                matchId, PageRequest.of(page, pageSize));
        return new MatchLiveLinkStatePage(
                result.getContent().stream().map(mapper::toSnapshot).toList(),
                result.getTotalElements(), result.hasNext());
    }

    @Override
    public List<MatchLiveLinkSnapshot> findAllHistory(Long matchId) {
        return liveLinks.findByMatch_IdOrderByCreatedAtDescIdDesc(matchId).stream()
                .map(mapper::toSnapshot)
                .toList();
    }

    private MatchLiveMatchSnapshot matchSnapshot(Match match) {
        return new MatchLiveMatchSnapshot(
                match.getId(), match.getLeagueCode(), match.getTeamIdA(), match.getTeamIdB(), match.getPoolId(),
                match.getMatchDate(), MatchStatusEnum.fromValue(match.getStatus().name()));
    }
}
