package com.blockout.notifications.delivery.application;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Returns active tokens and recipients with no active token for one bounded user page. */
public record DeliveryTokenPage(
        Map<Long, List<String>> tokensByUser,
        Set<Long> noTokenUserIds) {

    public DeliveryTokenPage {
        Map<Long, List<String>> copy = new LinkedHashMap<>();
        if (tokensByUser != null) {
            tokensByUser.forEach((userId, tokens) -> copy.put(userId, List.copyOf(tokens)));
        }
        tokensByUser = Map.copyOf(copy);
        noTokenUserIds = noTokenUserIds == null ? Set.of() : Set.copyOf(noTokenUserIds);
    }
}
