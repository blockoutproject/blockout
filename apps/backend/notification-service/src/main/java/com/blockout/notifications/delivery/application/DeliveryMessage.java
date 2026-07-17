package com.blockout.notifications.delivery.application;

import java.util.Map;

/** Carries one provider-neutral delivery request and local correlation identity. */
public record DeliveryMessage(
        String token,
        String title,
        String body,
        Map<String, Object> data,
        Long userId,
        Long matchId) {

    public DeliveryMessage {
        data = data == null ? Map.of() : Map.copyOf(data);
    }
}
