package com.blockout.notifications.services;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockout.notifications.models.enums.NotificationStatus;
import com.blockout.notifications.repositories.NotificationSendRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class NotificationSendService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationSendService.class);
    private final NotificationSendRepository notificationSendRepository;

    /**
     * Réserve (idempotent) tous les destinataires pour un match donné à partir des
     * entités liées.
     * Renvoie la liste des userIds effectivement nouvellement insérés en PENDING.
     *
     * @param matchId id du match
     * @param teamIdA id équipe A
     * @param teamIdB id équipe B
     * @param poolId  id poule
     */
    @Transactional
    public List<Long> reservePendingForMatch(Long matchId, Long teamIdA, Long teamIdB, Long poolId) {
        List<Long> reserved = notificationSendRepository.insertPendingForMatch(matchId, teamIdA, teamIdB, poolId);

        logger.info("Recipients reserved for match",
                keyValue("action", "notification_reserve"),
                keyValue("matchId", matchId),
                keyValue("teamIdA", teamIdA),
                keyValue("teamIdB", teamIdB),
                keyValue("poolId", poolId),
                keyValue("reservedCount", reserved.size()));

        return reserved;
    }

    /**
     * Marque les envois comme SENT (ou SENT_NO_TOKEN si noToken=true) pour un match
     * et une liste d'utilisateurs.
     */
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

    /**
     * Marque des envois en FAILED avec code/raison, par ex. rejet Expo immédiat.
     */
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

    /**
     * Marque des envois en DELIVERED (si tu actives les receipts Expo plus tard).
     */
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