package com.blockout.notifications.delivery.application;

import java.util.List;

/** Sends one bounded provider-neutral batch and returns immediate ticket outcomes. */
public interface PushDeliveryProvider {

    DeliveryBatchResult sendBatch(List<DeliveryMessage> messages);
}
