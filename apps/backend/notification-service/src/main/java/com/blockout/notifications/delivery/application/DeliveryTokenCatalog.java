package com.blockout.notifications.delivery.application;

import java.util.List;

/** Resolves active delivery tokens and deactivates provider-rejected tokens. */
public interface DeliveryTokenCatalog {

    DeliveryTokenPage resolvePage(List<Long> userIds);

    void deactivateInvalidTokens(List<String> tokens);
}
