package com.blockout.backend.api.subscription.webhook;

import com.blockout.backend.api.user.api.generated.RevenueCatWebhookApi;
import com.blockout.backend.api.user.api.models.RevenueCatWebhookRequest;
import com.blockout.backend.identity.config.BillingBindingProperties;
import com.blockout.backend.identity.subscription.application.Subscriptions;
import java.time.Instant;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Accepts authenticated provider notifications as requests to reread current evidence. */
@RestController
public class RevenueCatWebhookController implements RevenueCatWebhookApi {
  private final Subscriptions subscriptions;
  private final BillingBindingProperties billing;
  private static final Set<String> RELEVANT =
      Set.of(
          "INITIAL_PURCHASE",
          "RENEWAL",
          "CANCELLATION",
          "UNCANCELLATION",
          "NON_RENEWING_PURCHASE",
          "EXPIRATION",
          "BILLING_ISSUE",
          "PRODUCT_CHANGE",
          "TRANSFER",
          "SUBSCRIPTION_PAUSED",
          "TEMPORARY_ENTITLEMENT_GRANT",
          "REFUND_REVERSED");

  /**
   * Connects authenticated events to the exact configured billing namespace.
   *
   * @param subscriptions receipt and request owner
   * @param billing retained project/environment
   */
  public RevenueCatWebhookController(
      Subscriptions subscriptions, BillingBindingProperties billing) {
    this.subscriptions = subscriptions;
    this.billing = billing;
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> receiveRevenueCatWebhook(RevenueCatWebhookRequest request) {
    var event = request.getEvent();
    var customers = new HashSet<String>();
    var outgoing = new HashSet<String>();
    boolean relevant =
        RELEVANT.contains(event.getType())
            && (event.getEnvironment() == null && "TRANSFER".equals(event.getType())
                || billing.environment().equalsIgnoreCase(event.getEnvironment()));
    if (relevant) {
      if ("TRANSFER".equals(event.getType())) {
        outgoing.addAll(values(event.getTransferredFrom()));
        customers.addAll(outgoing);
        customers.addAll(values(event.getTransferredTo()));
      } else {
        if (event.getAppUserId() != null) customers.add(event.getAppUserId());
        customers.addAll(values(event.getAliases()));
      }
    }
    subscriptions.webhook(
        event.getId(),
        event.getType(),
        Instant.ofEpochMilli(event.getEventTimestampMs()),
        billing.projectId(),
        billing.environment(),
        customers,
        outgoing);
    return ResponseEntity.ok().build();
  }

  /**
   * Normalizes optional provider lists once at the transport boundary.
   *
   * @param values optional aliases/transfer IDs
   * @return provider values or an empty list
   */
  private static List<String> values(List<String> values) {
    return values == null ? List.of() : values;
  }
}
