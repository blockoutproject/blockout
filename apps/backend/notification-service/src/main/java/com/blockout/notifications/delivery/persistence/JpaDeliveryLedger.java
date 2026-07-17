package com.blockout.notifications.delivery.persistence;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.notifications.delivery.application.DeliveryLedger;
import com.blockout.notifications.models.enums.NotificationStatus;
import com.blockout.notifications.repositories.NotificationSendRepository;
import com.blockout.shared.model.NotificationTypeEnum;
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

    private final NotificationSendRepository repository;

    @Override
    @Transactional
    public List<Long> reserve(
            Long matchId,
            Long teamIdA,
            Long teamIdB,
            Long poolId,
            NotificationTypeEnum type) {
        List<Long> reserved = repository.insertPendingForMatchAndType(
                matchId, teamIdA, teamIdB, poolId, type.name());
        String action = switch (type) {
            case MATCH_FINISHED -> "notification_reserve_match_finished";
            case MATCH_LIVE_LINK_CREATED -> "notification_reserve_match_live_link";
            default -> "notification_reserve_" + type.name().toLowerCase(java.util.Locale.ROOT);
        };
        LOGGER.info("Recipients reserved",
                keyValue("action", action),
                keyValue("matchId", matchId),
                keyValue("teamIdA", teamIdA),
                keyValue("teamIdB", teamIdB),
                keyValue("poolId", poolId),
                keyValue("reservedCount", reserved.size()));
        return reserved;
    }

    @Override
    @Transactional
    public int markSent(Long matchId, Collection<Long> userIds) {
        LocalDateTime now = LocalDateTime.now();
        int updated = repository.markSent(matchId, userIds, NotificationStatus.SENT, now, now);
        log("notification_mark_sent", matchId, updated);
        return updated;
    }

    @Override
    @Transactional
    public int markNoToken(Long matchId, Collection<Long> userIds) {
        int updated = repository.markNoToken(matchId, userIds, LocalDateTime.now());
        log("notification_mark_no_token", matchId, updated);
        return updated;
    }

    @Override
    @Transactional
    public int markFailed(Long matchId, Collection<Long> userIds, String errorCode, String errorDetail) {
        LocalDateTime now = LocalDateTime.now();
        int updated = repository.markFailed(matchId, userIds, errorCode, errorDetail, now, now);
        LOGGER.info("Marked FAILED",
                keyValue("action", "notification_mark_failed"),
                keyValue("matchId", matchId),
                keyValue("count", updated),
                keyValue("errorCode", errorCode));
        return updated;
    }

    private void log(String action, Long matchId, int updated) {
        LOGGER.info("Delivery ledger updated",
                keyValue("action", action),
                keyValue("matchId", matchId),
                keyValue("count", updated));
    }
}
