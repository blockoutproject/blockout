package com.blockout.notifications.delivery.persistence;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.notifications.delivery.application.DeliveryTokenCatalog;
import com.blockout.notifications.delivery.application.DeliveryTokenPage;
import com.blockout.notifications.models.entity.PushToken;
import com.blockout.notifications.repositories.PushTokenRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Adapts push-token rows to provider-neutral delivery token pages. */
@Component
@RequiredArgsConstructor
public class JpaDeliveryTokenCatalog implements DeliveryTokenCatalog {

    private static final Logger LOGGER = LoggerFactory.getLogger(JpaDeliveryTokenCatalog.class);

    private final PushTokenRepository repository;

    @Override
    @Transactional(readOnly = true)
    public DeliveryTokenPage resolvePage(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return new DeliveryTokenPage(Map.of(), Set.of());
        }
        List<PushToken> rows = repository.findAllByUserIdInAndActiveTrue(userIds);
        Map<Long, List<String>> tokensByUser = rows.stream().collect(Collectors.groupingBy(
                PushToken::getUserId,
                Collectors.mapping(PushToken::getExpoPushToken, Collectors.toList())));
        Set<Long> noTokenUserIds = userIds.stream()
                .filter(id -> !tokensByUser.containsKey(id) || tokensByUser.get(id).isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        LOGGER.info("Resolved tokens (page)",
                keyValue("action", "resolve_tokens_page"),
                keyValue("userCount", userIds.size()),
                keyValue("resolvedUserCount", tokensByUser.size()),
                keyValue("noTokenUsers", noTokenUserIds.size()));
        return new DeliveryTokenPage(tokensByUser, noTokenUserIds);
    }

    @Override
    @Transactional
    public void deactivateInvalidTokens(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) {
            return;
        }
        List<String> distinct = tokens.stream()
                .filter(token -> token != null && !token.isBlank())
                .distinct()
                .toList();
        if (distinct.isEmpty()) {
            return;
        }
        int updated = repository.deactivateByTokens(distinct);
        LOGGER.info("Push token batch deactivated",
                keyValue("action", "deactivate_push_token_batch"),
                keyValue("requested", tokens.size()),
                keyValue("distinct", distinct.size()),
                keyValue("deactivated", updated));
    }
}
