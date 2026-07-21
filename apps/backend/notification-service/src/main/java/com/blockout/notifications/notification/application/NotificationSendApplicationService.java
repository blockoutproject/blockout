package com.blockout.notifications.notification.application;

import com.blockout.notifications.notification.application.models.NotificationStatus;
import com.blockout.notifications.notification.application.models.NotificationType;
import com.blockout.notifications.notification.infrastructure.persistence.repositories.NotificationSendRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class NotificationSendApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationSendApplicationService.class);
    private final NotificationSendRepository notificationSendRepository;

    /**
     * Match terminé : réserve les destinataires (idempotent) pour le type
     * MATCH_FINISHED.
     */
    @Transactional
    public List<Long> reservePendingForMatchFinished(Long matchId, Long teamIdA, Long teamIdB, Long poolId) {
        List<Long> reserved = notificationSendRepository.insertPendingForMatchAndType(
            matchId,
            teamIdA,
            teamIdB,
            poolId,
            NotificationType.MATCH_FINISHED.name());

        logger.info("Recipients reserved for MATCH_FINISHED",
            keyValue("action", "notification_reserve_match_finished"),
            keyValue("matchId", matchId),
            keyValue("teamIdA", teamIdA),
            keyValue("teamIdB", teamIdB),
            keyValue("poolId", poolId),
            keyValue("reservedCount", reserved.size()));

        return reserved;
    }

    /**
     * Lien de live créé : réserve les destinataires (idempotent) pour le type
     * MATCH_LIVE_LINK_CREATED.
     */
    @Transactional
    public List<Long> reservePendingForMatchLiveLinkCreated(Long matchId, Long teamIdA, Long teamIdB, Long poolId) {
        List<Long> reserved = notificationSendRepository.insertPendingForMatchAndType(
            matchId,
            teamIdA,
            teamIdB,
            poolId,
            NotificationType.MATCH_LIVE_LINK_CREATED.name());

        logger.info("Recipients reserved for MATCH_LIVE_LINK_CREATED",
            keyValue("action", "notification_reserve_match_live_link"),
            keyValue("matchId", matchId),
            keyValue("teamIdA", teamIdA),
            keyValue("teamIdB", teamIdB),
            keyValue("poolId", poolId),
            keyValue("reservedCount", reserved.size()));

        return reserved;
    }

    @Transactional
    public int markSent(Long matchId, Collection<Long> userIds, boolean noToken) {
        LocalDateTime now = LocalDateTime.now();
        if (noToken) {
            int n = notificationSendRepository.markNoToken(matchId, userIds, now);
            logger.info("Marked SENT_NO_TOKEN",
                keyValue("action", "notification_mark_no_token"),
                keyValue("matchId", matchId),
                keyValue("count", n));
            return n;
        }
        int n = notificationSendRepository.markSent(matchId, userIds, NotificationStatus.SENT, now, now);
        logger.info("Marked SENT",
            keyValue("action", "notification_mark_sent"),
            keyValue("matchId", matchId),
            keyValue("count", n));
        return n;
    }

    @Transactional
    public int markFailed(Long matchId, Collection<Long> userIds, String errorCode, String errorDetail) {
        LocalDateTime now = LocalDateTime.now();
        int n = notificationSendRepository.markFailed(matchId, userIds, errorCode, errorDetail, now, now);
        logger.info("Marked FAILED",
            keyValue("action", "notification_mark_failed"),
            keyValue("matchId", matchId),
            keyValue("count", n),
            keyValue("errorCode", errorCode));
        return n;
    }

    @Transactional
    public int markDelivered(Long matchId, Collection<Long> userIds) {
        LocalDateTime now = LocalDateTime.now();
        int n = notificationSendRepository.markDelivered(matchId, userIds, now, now);
        logger.info("Marked DELIVERED",
            keyValue("action", "notification_mark_delivered"),
            keyValue("matchId", matchId),
            keyValue("count", n));
        return n;
    }
}
