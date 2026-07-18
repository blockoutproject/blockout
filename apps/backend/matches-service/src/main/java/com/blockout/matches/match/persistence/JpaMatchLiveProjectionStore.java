package com.blockout.matches.match.persistence;

import com.blockout.matches.match.application.MatchLiveProjection;
import com.blockout.matches.match.application.MatchLiveProjectionStore;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.shared.model.LiveProviderEnum;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaMatchLiveProjectionStore implements MatchLiveProjectionStore {

    private final MatchLiveLinkRepository repository;

    @Override
    public Optional<MatchLiveProjection> findNewestActive(Long matchId) {
        return repository.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .map(this::toProjection);
    }

    @Override
    public List<MatchLiveProjection> findActiveByMatchIds(List<Long> matchIds) {
        return repository.findByMatchIdInAndStatus(matchIds, LiveLinkStatus.ACTIVE).stream()
                .map(this::toProjection)
                .toList();
    }

    private MatchLiveProjection toProjection(MatchLiveLink link) {
        return new MatchLiveProjection(
                link.getMatch().getId(),
                link.getUrl(),
                LiveProviderEnum.fromValue(link.getProvider().name()),
                link.getOwnerAuth0Id(),
                link.getCreatedAt());
    }
}
