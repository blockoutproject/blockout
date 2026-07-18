package com.blockout.matches.match.live.moderation.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
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

    private final MatchLiveModerationStore moderation;
    private final MatchLiveModerationPolicy policy;
    private final MatchLiveModerationProjector projector;
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
        return moderation.findAllWithLiveLinks().stream()
                .map(match -> policy.selectRepresentative(match.links(), statusFilter)
                        .map(link -> projector.toView(match, link))
                        .orElse(null))
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(MatchLiveModerationView::matchDate).reversed())
                .toList();
    }

    @Transactional
    public void moderate(ModerateMatchLiveLinkCommand command) {
        MatchLiveModerationLinkSnapshot link = requireLink(command.liveLinkId());
        switch (command.decision()) {
            case APPROVE -> approve(link);
            case REJECT -> reject(link);
            case REACTIVATE -> reactivate(link);
        }
    }

    private void approve(MatchLiveModerationLinkSnapshot link) {
        policy.validatePending(link);
        Long matchId = link.matchId();
        if (matchId == null) {
            throw new MatchNotFoundException(null);
        }

        Instant now = clock.instant();
        moderation.findNewestActive(matchId).ifPresent(active -> {
            moderation.changeStatus(active.id(), LiveLinkStatusEnum.EXPIRED, now);
            LOGGER.info("Active live link expired due to approval of pending link",
                    keyValue("action", "expire_active_on_pending_approval"),
                    keyValue("expired_live_link_id", active.id()), keyValue("match_id", matchId),
                    keyValue("approved_pending_live_link_id", link.id()));
        });

        moderation.changeStatus(link.id(), LiveLinkStatusEnum.ACTIVE, now);
        moderation.touchMatch(matchId, now);
        LOGGER.info("Pending live link approved by admin", keyValue("action", "approve_pending_live_link"),
                keyValue("live_link_id", link.id()), keyValue("match_id", matchId),
                keyValue("owner_auth0_id", link.ownerAuth0Id()));
    }

    private void reject(MatchLiveModerationLinkSnapshot link) {
        policy.validatePending(link);
        moderation.changeStatus(link.id(), LiveLinkStatusEnum.REJECTED, clock.instant());
        LOGGER.info("Pending live link rejected by admin", keyValue("action", "reject_pending_live_link"),
                keyValue("live_link_id", link.id()), keyValue("match_id", link.matchId()),
                keyValue("owner_auth0_id", link.ownerAuth0Id()));
    }

    private void reactivate(MatchLiveModerationLinkSnapshot link) {
        policy.validateReactivatable(link);
        Long matchId = link.matchId();
        if (matchId == null) {
            throw new IllegalStateException("Match associé au lien introuvable.");
        }

        Instant now = clock.instant();
        moderation.findNewestActive(matchId).ifPresent(active -> {
            if (!active.id().equals(link.id())) {
                moderation.changeStatus(active.id(), LiveLinkStatusEnum.DEACTIVATED, now);
                LOGGER.info("Previous active live link deactivated before activation",
                        keyValue("action", "deactivate_previous_active_live_link"),
                        keyValue("match_id", matchId), keyValue("previous_live_link_id", active.id()),
                        keyValue("new_live_link_id", link.id()),
                        keyValue("new_previous_status", LiveLinkStatusEnum.DEACTIVATED));
            }
        });

        moderation.changeStatus(link.id(), LiveLinkStatusEnum.ACTIVE, now);
        moderation.touchMatch(matchId, now);
        LOGGER.info("Live link activated by moderation", keyValue("action", "reactivate_live_link"),
                keyValue("live_link_id", link.id()), keyValue("match_id", matchId),
                keyValue("owner_auth0_id", link.ownerAuth0Id()),
                keyValue("new_status", LiveLinkStatusEnum.ACTIVE));
    }

    private MatchLiveModerationLinkSnapshot requireLink(Long liveLinkId) {
        return moderation.findById(liveLinkId)
                .orElseThrow(() -> new IllegalStateException("Lien introuvable."));
    }
}
