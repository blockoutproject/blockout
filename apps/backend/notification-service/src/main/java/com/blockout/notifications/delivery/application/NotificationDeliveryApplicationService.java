package com.blockout.notifications.delivery.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.notifications.inbox.application.CreateInboxNotificationCommand;
import com.blockout.notifications.inbox.application.NotificationInboxWriter;
import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Owns typed delivery decisions and the retained multi-system side-effect order. */
@Service
@RequiredArgsConstructor
public class NotificationDeliveryApplicationService implements NotificationDelivery {

    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationDeliveryApplicationService.class);
    private static final int RESOLVE_PAGE_SIZE = 2_000;
    private static final int PROVIDER_BATCH_SIZE = 100;

    private final DeliveryLedger ledger;
    private final NotificationInboxWriter inbox;
    private final DeliveryTokenCatalog tokens;
    private final PushDeliveryProvider provider;

    @Override
    public void deliver(NotificationDeliveryCommand command) {
        DeliveryReservation reservation = command.reservation();
        DeliveryAttemptKey attempt = reservation.attempt();
        List<Long> reservedUserIds = ledger.reserve(reservation);
        String context = context(command);
        if (reservedUserIds == null || reservedUserIds.isEmpty()) {
            LOGGER.info("No recipients reserved",
                    keyValue("action", "notification_reserve_empty_" + context),
                    keyValue("matchId", command.matchId()),
                    keyValue("notificationType", command.notificationType()));
            return;
        }

        createInbox(command, reservedUserIds);
        LOGGER.info("User notifications created",
                keyValue("action", "user_notifications_created_" + context),
                keyValue("matchId", command.matchId()),
                keyValue("count", reservedUserIds.size()));

        int pageIndex = 0;
        for (int from = 0; from < reservedUserIds.size(); from += RESOLVE_PAGE_SIZE, pageIndex++) {
            int to = Math.min(from + RESOLVE_PAGE_SIZE, reservedUserIds.size());
            processPage(command, attempt, context, pageIndex, reservedUserIds.subList(from, to));
        }

        LOGGER.info("Push pipeline completed",
                keyValue("action", "notification_push_done_" + context),
                keyValue("matchId", command.matchId()),
                keyValue("notificationType", command.notificationType()));
    }

    private void createInbox(NotificationDeliveryCommand command, List<Long> userIds) {
        List<CreateInboxNotificationCommand> entries = userIds.stream()
                .map(userId -> new CreateInboxNotificationCommand(
                        userId,
                        command.notificationType(),
                        command.title(),
                        command.body(),
                        "/match/" + command.matchId(),
                        NotificationTargetTypeEnum.MATCH,
                        command.matchId(),
                        JsonNodeFactory.instance.objectNode().put("divisionId", command.divisionId())))
                .toList();
        inbox.createBatch(entries);
    }

    private void processPage(
            NotificationDeliveryCommand command,
            DeliveryAttemptKey attempt,
            String context,
            int pageIndex,
            List<Long> pageUserIds) {
        DeliveryTokenPage tokenPage = tokens.resolvePage(pageUserIds);
        if (!tokenPage.noTokenUserIds().isEmpty()) {
            ledger.markNoToken(attempt, tokenPage.noTokenUserIds());
        }

        List<DeliveryMessage> messages = messages(command, tokenPage.tokensByUser());
        LOGGER.info("Resolve page built",
                keyValue("action", "notification_resolve_page_" + context),
                keyValue("matchId", command.matchId()),
                keyValue("pageIndex", pageIndex),
                keyValue("pageSize", pageUserIds.size()),
                keyValue("messageCount", messages.size()));

        Set<Long> successful = new LinkedHashSet<>();
        Set<Long> failed = new LinkedHashSet<>();
        Set<Long> retryable = new LinkedHashSet<>();
        List<String> invalidTokens = new ArrayList<>();

        int batchIndex = 0;
        for (int from = 0; from < messages.size(); from += PROVIDER_BATCH_SIZE, batchIndex++) {
            List<DeliveryMessage> batch = messages.subList(
                    from, Math.min(from + PROVIDER_BATCH_SIZE, messages.size()));
            DeliveryBatchResult result = sendBatch(command, context, pageIndex, batchIndex, batch);
            successful.addAll(result.successfulUserIds());
            failed.addAll(result.failedUserIds());
            retryable.addAll(result.retryableUserIds());
            invalidTokens.addAll(result.invalidTokens());
        }

        failed.removeAll(successful);
        retryable.removeAll(successful);
        failed.removeAll(retryable);
        if (!successful.isEmpty()) {
            ledger.markSent(attempt, successful);
        }
        if (!failed.isEmpty()) {
            ledger.markFailed(attempt, failed, "EXPO_SEND_ERROR", "See logs for details");
        }
        if (!invalidTokens.isEmpty()) {
            tokens.deactivateInvalidTokens(invalidTokens.stream().distinct().toList());
        }

        LOGGER.info("Resolve+push page done",
                keyValue("action", "notification_page_done_" + context),
                keyValue("matchId", command.matchId()),
                keyValue("pageIndex", pageIndex),
                keyValue("pageUsers", pageUserIds.size()),
                keyValue("sentUsers", successful.size()),
                keyValue("failedUsers", failed.size()),
                keyValue("retryableUsers", retryable.size()));
    }

    private DeliveryBatchResult sendBatch(
            NotificationDeliveryCommand command,
            String context,
            int pageIndex,
            int batchIndex,
            List<DeliveryMessage> batch) {
        try {
            DeliveryBatchResult result = provider.sendBatch(batch);
            LOGGER.info("Provider batch done",
                    keyValue("action", "expo_batch_done_" + context),
                    keyValue("matchId", command.matchId()),
                    keyValue("pageIndex", pageIndex),
                    keyValue("batchIndex", batchIndex),
                    keyValue("batchSize", batch.size()),
                    keyValue("okUsers", result.successfulUserIds().size()),
                    keyValue("failedUsers", result.failedUserIds().size()),
                    keyValue("retryableUsers", result.retryableUserIds().size()),
                    keyValue("invalidTokens", result.invalidTokens().size()));
            return result;
        } catch (RuntimeException exception) {
            Set<Long> failedUsers = batch.stream()
                    .map(DeliveryMessage::userId)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            LOGGER.error("Provider batch send failed",
                    keyValue("action", "expo_batch_failed_" + context),
                    keyValue("matchId", command.matchId()),
                    keyValue("pageIndex", pageIndex),
                    keyValue("batchIndex", batchIndex),
                    keyValue("batchSize", batch.size()),
                    exception);
            return new DeliveryBatchResult(Set.of(), failedUsers, Set.of(), List.of());
        }
    }

    private List<DeliveryMessage> messages(
            NotificationDeliveryCommand command,
            Map<Long, List<String>> tokensByUser) {
        List<DeliveryMessage> messages = new ArrayList<>();
        tokensByUser.forEach((userId, userTokens) -> {
            List<String> distinctTokens = userTokens == null ? List.of() : userTokens.stream().distinct().toList();
            distinctTokens.forEach(token -> messages.add(new DeliveryMessage(
                    token,
                    command.title(),
                    command.body(),
                    Map.of("url", "blockout://match/" + command.matchId()),
                    userId,
                    command.matchId())));
        });
        return messages;
    }

    private String context(NotificationDeliveryCommand command) {
        return switch (command.notificationType()) {
            case MATCH_FINISHED -> "match_finished";
            case MATCH_LIVE_LINK_CREATED -> "match_live_link_created";
            default -> command.notificationType().name().toLowerCase(java.util.Locale.ROOT);
        };
    }
}
