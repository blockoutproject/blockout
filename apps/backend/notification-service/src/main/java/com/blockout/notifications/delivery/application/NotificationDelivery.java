package com.blockout.notifications.delivery.application;

/** Executes one resolved notification delivery workflow. */
public interface NotificationDelivery {

    void deliver(NotificationDeliveryCommand command);
}
