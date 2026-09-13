package com.blockout.backend.api.subscription.webhook;

import com.blockout.backend.api.user.api.generated.RevenueCatWebhookApi;
import com.blockout.backend.api.user.api.models.RevenueCatEnvironmentEnum;
import com.blockout.backend.api.user.api.models.RevenueCatEventTypeEnum;
import com.blockout.backend.api.user.api.models.RevenueCatWebhookEvent;
import com.blockout.backend.api.user.api.models.RevenueCatWebhookRequest;
import com.blockout.backend.identity.config.BillingBindingProperties;
import com.blockout.backend.identity.subscription.application.Subscriptions;
import java.time.Instant;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Accepts authenticated provider notifications as requests to reread current evidence. */
@RestController
@RequiredArgsConstructor
public class RevenueCatWebhookController implements RevenueCatWebhookApi {
  /** Receipt and request owner. */
  private final Subscriptions subscriptions;

  /** Retained project/environment. */
  private final BillingBindingProperties billing;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> receiveRevenueCatWebhook(RevenueCatWebhookRequest request) {
    RevenueCatWebhookEvent event = request.getEvent();
    RevenueCatEventTypeEnum eventType = event.getType();
    RevenueCatEnvironmentEnum expectedEnvironment =
        RevenueCatEnvironmentEnum.valueOf(billing.environment().name());
    Set<String> customers = new HashSet<>();
    Set<String> outgoing = new HashSet<>();
    boolean relevant =
        requiresRefresh(eventType)
            && (event.getEnvironment() == null && eventType == RevenueCatEventTypeEnum.TRANSFER
                || expectedEnvironment == event.getEnvironment());
    if (relevant) {
      if (eventType == RevenueCatEventTypeEnum.TRANSFER) {
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
        eventType.getValue(),
        Instant.ofEpochMilli(event.getEventTimestampMs()),
        billing.projectId(),
        billing.environment(),
        customers,
        outgoing);
    return ResponseEntity.ok().build();
  }

  /**
   * Selects provider events that can change current subscription access. Unknown and unrelated
   * events are acknowledged without scheduling provider reads.
   *
   * @param eventType generated provider event classification
   * @return whether the event requests fresh subscription evidence
   */
  private static boolean requiresRefresh(RevenueCatEventTypeEnum eventType) {
    return switch (eventType) {
      case INITIAL_PURCHASE,
          RENEWAL,
          CANCELLATION,
          UNCANCELLATION,
          NON_RENEWING_PURCHASE,
          EXPIRATION,
          BILLING_ISSUE,
          PRODUCT_CHANGE,
          TRANSFER,
          SUBSCRIPTION_PAUSED,
          SUBSCRIPTION_EXTENDED,
          TEMPORARY_ENTITLEMENT_GRANT,
          REFUND_REVERSED,
          PURCHASE_REDEEMED ->
          true;
      case TEST,
          INVOICE_ISSUANCE,
          VIRTUAL_CURRENCY_TRANSACTION,
          EXPERIMENT_ENROLLMENT,
          UNKNOWN_DEFAULT_OPEN_API ->
          false;
    };
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
