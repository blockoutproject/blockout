package com.blockout.matches.services;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Transitional owner for moderation state changes migrated by MRG-362. */
@Service
@RequiredArgsConstructor
public class MatchLiveLinkService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchLiveLinkService.class);

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository liveLinkRepository;

    @Transactional
    public void approvePendingLink(Long liveLinkId) {
        MatchLiveLink link = liveLinkRepository.findById(liveLinkId)
                .orElseThrow(() -> new IllegalStateException("Lien introuvable."));
        if (link.getStatus() != LiveLinkStatus.PENDING) {
            throw new IllegalStateException("Ce lien n'est pas en attente de validation.");
        }

        Match match = link.getMatch();
        if (match == null || match.getId() == null) {
            throw new MatchNotFoundException(null);
        }
        Long matchId = match.getId();
        Instant now = Instant.now();
        liveLinkRepository.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .ifPresent(active -> {
                    active.setStatus(LiveLinkStatus.EXPIRED);
                    active.setLastUpdate(now);
                    liveLinkRepository.save(active);
                    LOGGER.info("Active live link expired due to approval of pending link",
                            keyValue("action", "expire_active_on_pending_approval"),
                            keyValue("expired_live_link_id", active.getId()), keyValue("match_id", matchId),
                            keyValue("approved_pending_live_link_id", liveLinkId));
                });

        link.setStatus(LiveLinkStatus.ACTIVE);
        link.setLastUpdate(now);
        liveLinkRepository.save(link);
        match.setLastUpdate(now);
        matchRepository.save(match);
        LOGGER.info("Pending live link approved by admin", keyValue("action", "approve_pending_live_link"),
                keyValue("live_link_id", link.getId()), keyValue("match_id", matchId),
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()));
    }

    @Transactional
    public void rejectPendingLink(Long liveLinkId) {
        MatchLiveLink link = liveLinkRepository.findById(liveLinkId)
                .orElseThrow(() -> new IllegalStateException("Lien introuvable."));
        if (link.getStatus() != LiveLinkStatus.PENDING) {
            throw new IllegalStateException("Ce lien n'est pas en attente de validation.");
        }

        Instant now = Instant.now();
        link.setStatus(LiveLinkStatus.REJECTED);
        link.setLastUpdate(now);
        liveLinkRepository.save(link);
        LOGGER.info("Pending live link rejected by admin", keyValue("action", "reject_pending_live_link"),
                keyValue("live_link_id", link.getId()),
                keyValue("match_id", link.getMatch() == null ? null : link.getMatch().getId()),
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()));
    }

    @Transactional
    public void reactivateLiveLink(Long liveLinkId) {
        MatchLiveLink link = liveLinkRepository.findById(liveLinkId)
                .orElseThrow(() -> new IllegalStateException("Lien introuvable."));
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
        Instant now = Instant.now();
        liveLinkRepository.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .ifPresent(active -> {
                    if (!active.getId().equals(link.getId())) {
                        active.setStatus(LiveLinkStatus.DEACTIVATED);
                        active.setLastUpdate(now);
                        liveLinkRepository.save(active);
                        LOGGER.info("Previous active live link deactivated before activation",
                                keyValue("action", "deactivate_previous_active_live_link"),
                                keyValue("match_id", matchId), keyValue("previous_live_link_id", active.getId()),
                                keyValue("new_live_link_id", link.getId()),
                                keyValue("new_previous_status", active.getStatus()));
                    }
                });

        link.setStatus(LiveLinkStatus.ACTIVE);
        link.setLastUpdate(now);
        liveLinkRepository.save(link);
        match.setLastUpdate(now);
        matchRepository.save(match);
        LOGGER.info("Live link activated by moderation", keyValue("action", "reactivate_live_link"),
                keyValue("live_link_id", link.getId()), keyValue("match_id", matchId),
                keyValue("owner_auth0_id", link.getOwnerAuth0Id()), keyValue("new_status", link.getStatus()));
    }
}
