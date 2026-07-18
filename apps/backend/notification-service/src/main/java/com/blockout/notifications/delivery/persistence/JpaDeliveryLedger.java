package com.blockout.notifications.delivery.persistence;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.notifications.delivery.application.DeliveryAttemptKey;
import com.blockout.notifications.delivery.application.DeliveryLedger;
import com.blockout.notifications.delivery.application.DeliveryReservation;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Contains the current typed reservation and immediate ledger transitions. */
@Component
@RequiredArgsConstructor
public class JpaDeliveryLedger implements DeliveryLedger {

    private static final Logger LOGGER = LoggerFactory.getLogger(JpaDeliveryLedger.class);

    private final DeliveryAttemptRepository repository;
    private final Clock clock;

    @Override
    @Transactional
    public List<Long> reserve(DeliveryReservation reservation) {
        DeliveryAttemptKey attempt = reservation.attempt();
        List<Long> reserved = repository.insertPendingForMatchAndType(
                attempt.matchId(),
                reservation.teamIdA(),
                reservation.teamIdB(),
                reservation.poolId(),
                attempt.notificationType().name());
        String action = switch (attempt.notificationType()) {
            case MATCH_FINISHED -> "notification_reserve_match_finished";
            case MATCH_LIVE_LINK_CREATED -> "notification_reserve_match_live_link";
            default -> "notification_reserve_"
                    + attempt.notificationType().name().toLowerCase(java.util.Locale.ROOT);
        };
        LOGGER.info("Recipients reserved",
                keyValue("action", action),
                keyValue("matchId", attempt.matchId()),
                keyValue("notificationType", attempt.notificationType()),
                keyValue("teamIdA", reservation.teamIdA()),
                keyValue("teamIdB", reservation.teamIdB()),
                keyValue("poolId", reservation.poolId()),
                keyValue("reservedCount", reserved.size()));
        return reserved;
    }

    @Override
    @Transactional
    public int markSent(DeliveryAttemptKey attempt, Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return 0;
        }
        LocalDateTime now = LocalDateTime.now(clock);
        int updated = repository.markSent(
                attempt.matchId(), attempt.notificationType(), userIds, now, now);
        log("notification_mark_sent", attempt, updated);
        return updated;
    }

    @Override
    @Transactional
    public int markNoToken(DeliveryAttemptKey attempt, Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return 0;
        }
        int updated = repository.markNoToken(
                attempt.matchId(),
                attempt.notificationType(),
                userIds,
                LocalDateTime.now(clock));
        log("notification_mark_no_token", attempt, updated);
        return updated;
    }

    @Override
    @Transactional
    public int markFailed(
            DeliveryAttemptKey attempt,
            Collection<Long> userIds,
            String errorCode,
            String errorDetail) {
        if (userIds == null || userIds.isEmpty()) {
            return 0;
        }
        LocalDateTime now = LocalDateTime.now(clock);
        int updated = repository.markFailed(
                attempt.matchId(),
                attempt.notificationType(),
                userIds,
                errorCode,
                errorDetail,
                now,
                now);
        LOGGER.info("Marked FAILED",
                keyValue("action", "notification_mark_failed"),
                keyValue("matchId", attempt.matchId()),
                keyValue("notificationType", attempt.notificationType()),
                keyValue("count", updated),
                keyValue("errorCode", errorCode));
        return updated;
    }

    private void log(String action, DeliveryAttemptKey attempt, int updated) {
        LOGGER.info("Delivery ledger updated",
                keyValue("action", action),
                keyValue("matchId", attempt.matchId()),
                keyValue("notificationType", attempt.notificationType()),
                keyValue("count", updated));
    }
}
