package com.blockout.matches.match.live.moderation.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.match.live.moderation.persistence.MatchLiveModerationPersistenceMapper;
import com.blockout.matches.match.persistence.Match;
import com.blockout.matches.match.persistence.MatchRepository;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.shared.model.LiveLinkStatusEnum;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchLiveModerationApplicationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchLiveModerationApplicationService.class);

    private final MatchRepository matches;
    private final MatchLiveLinkRepository liveLinks;
    private final MatchLiveModerationPersistenceMapper mapper;
    private final Clock clock;

    @Transactional(readOnly = true)
    public MatchLiveModerationPage findPage(MatchLiveModerationQuery query) {
        List<MatchLiveModerationView> all = findAll(query.status());
        long first = (long) query.page() * query.pageSize();
        int fromIndex = (int) Math.min(first, all.size());
        int toIndex = (int) Math.min(first + query.pageSize(), all.size());
        return new MatchLiveModerationPage(
                List.copyOf(all.subList(fromIndex, toIndex)),
                query.page(), query.pageSize(), all.size(), toIndex < all.size());
    }

    @Transactional(readOnly = true)
    public List<MatchLiveModerationView> findAll(LiveLinkStatusEnum statusFilter) {
        LiveLinkStatus persistenceStatus = statusFilter == null
                ? null
                : LiveLinkStatus.valueOf(statusFilter.getValue());
        return matches.findAllWithLiveLinks().stream()
                .map(match -> summary(match, persistenceStatus))
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(MatchLiveModerationView::matchDate).reversed())
                .toList();
    }

    @Transactional
    public void moderate(ModerateMatchLiveLinkCommand command) {
        switch (command.decision()) {
            case APPROVE -> approve(command.liveLinkId());
            case REJECT -> reject(command.liveLinkId());
            case REACTIVATE -> reactivate(command.liveLinkId());
        }
    }

    private MatchLiveModerationView summary(Match match, LiveLinkStatus statusFilter) {
        List<MatchLiveLink> links = match.getLiveLinks();
        if (links == null || links.isEmpty()) {
            return null;
        }
        if (statusFilter != null && links.stream().noneMatch(link -> link.getStatus() == statusFilter)) {
            return null;
        }
        MatchLiveLink representative = selectRepresentativeLink(links);
        return representative == null ? null : mapper.toView(match, representative);
    }

    private MatchLiveLink selectRepresentativeLink(List<MatchLiveLink> links) {
        return links.stream()
                .max(Comparator.comparingInt((MatchLiveLink link) -> statusPriority(link.getStatus()))
                        .thenComparing(MatchLiveLink::getCreatedAt,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
    }

    private int statusPriority(LiveLinkStatus status) {
        if (status == null) {
            return 0;
        }
        return switch (status) {
            case ACTIVE -> 6;
            case PENDING -> 5;
            case BANNED -> 4;
            case DEACTIVATED -> 3;
            case REJECTED -> 2;
            case EXPIRED -> 1;
        };
    }

    private void approve(Long liveLinkId) {
        MatchLiveLink link = requireLink(liveLinkId);
        if (link.getStatus() != LiveLinkStatus.PENDING) {
            throw new IllegalStateException("Ce lien n'est pas en attente de validation.");
        }

        Match match = link.getMatch();
        if (match == null || match.getId() == null) {
            throw new MatchNotFoundException(null);
        }
        Long matchId = match.getId();
        Instant now = clock.instant();
        liveLinks.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .ifPresent(active -> {
                    active.setStatus(LiveLinkStatus.EXPIRED);
                    active.setLastUpdate(now);
                    liveLinks.save(active);
                    LOGGER.info("Active live link expired due to approval of pending link",
                            keyValue("action", "expire_active_on_pending_approval"),
                            keyValue("expired_live_link_id", active.getId()), keyValue("match_id", matchId),
                            keyValue("approved_pending_live_link_id", liveLinkId));
                });

        link.setStatus(LiveLinkStatus.ACTIVE);
        link.setLastUpdate(now);
        liveLinks.save(link);
        match.setLastUpdate(now);
        matches.save(match);
        LOGGER.info("Pending live link approved by admin", keyValue("action", "approve_pending_live_link"),
                keyValue("live_link_id", link.getId()), keyValue("match_id", matchId),
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()));
    }

    private void reject(Long liveLinkId) {
        MatchLiveLink link = requireLink(liveLinkId);
        if (link.getStatus() != LiveLinkStatus.PENDING) {
            throw new IllegalStateException("Ce lien n'est pas en attente de validation.");
        }

        link.setStatus(LiveLinkStatus.REJECTED);
        link.setLastUpdate(clock.instant());
        liveLinks.save(link);
        LOGGER.info("Pending live link rejected by admin", keyValue("action", "reject_pending_live_link"),
                keyValue("live_link_id", link.getId()),
                keyValue("match_id", link.getMatch() == null ? null : link.getMatch().getId()),
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()));
    }

    private void reactivate(Long liveLinkId) {
        MatchLiveLink link = requireLink(liveLinkId);
        LiveLinkStatus status = link.getStatus();
        if (status != LiveLinkStatus.REJECTED && status != LiveLinkStatus.EXPIRED
                && status != LiveLinkStatus.DEACTIVATED && status != LiveLinkStatus.BANNED) {
            throw new IllegalStateException("Ce lien ne peut pas être réactivé dans son état actuel.");
        }

        Match match = link.getMatch();
        if (match == null || match.getId() == null) {
            throw new IllegalStateException("Match associé au lien introuvable.");
        }
        Long matchId = match.getId();
        Instant now = clock.instant();
        liveLinks.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .ifPresent(active -> {
                    if (!active.getId().equals(link.getId())) {
                        active.setStatus(LiveLinkStatus.DEACTIVATED);
                        active.setLastUpdate(now);
                        liveLinks.save(active);
                        LOGGER.info("Previous active live link deactivated before activation",
                                keyValue("action", "deactivate_previous_active_live_link"),
                                keyValue("match_id", matchId), keyValue("previous_live_link_id", active.getId()),
                                keyValue("new_live_link_id", link.getId()),
                                keyValue("new_previous_status", active.getStatus()));
                    }
                });

        link.setStatus(LiveLinkStatus.ACTIVE);
        link.setLastUpdate(now);
        liveLinks.save(link);
        match.setLastUpdate(now);
        matches.save(match);
        LOGGER.info("Live link activated by moderation", keyValue("action", "reactivate_live_link"),
                keyValue("live_link_id", link.getId()), keyValue("match_id", matchId),
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()), keyValue("new_status", link.getStatus()));
    }

    private MatchLiveLink requireLink(Long liveLinkId) {
        return liveLinks.findById(liveLinkId)
                .orElseThrow(() -> new IllegalStateException("Lien introuvable."));
    }
}
