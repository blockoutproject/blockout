package com.blockout.backend.notifications.api;

import com.blockout.backend.generated.mobile.api.PushSubscriptionsApi;
import com.blockout.backend.generated.mobile.model.PushSubscriptionResponse;
import com.blockout.backend.generated.mobile.model.ReplacePushSubscriptionRequest;
import com.blockout.backend.notifications.application.ChangePushSubscriptions;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Replacement;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Generated push association boundary after ordinary F05/F12 authentication, owner checks and admission. */
@RestController
@RequiredArgsConstructor
public class PushSubscriptionsController implements PushSubscriptionsApi {
  private final NotificationRequest request;
  private final HttpServletRequest http;
  private final ChangePushSubscriptions changes;
  private final NotificationApiMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<PushSubscriptionResponse> replacePushSubscription(UUID accountId, UUID subscriptionId, ReplacePushSubscriptionRequest body, Boolean bypass) {
    NotificationContext owner = request.owner(accountId);
    request.validateQuery(http, false);
    Replacement result = changes.replace(mapper.toRegistration(body, subscriptionId, owner.accountId()));
    ResponseEntity.BodyBuilder response = result.created()
        ? ResponseEntity.created(URI.create("/accounts/" + accountId + "/push-subscriptions/" + subscriptionId))
        : ResponseEntity.ok();
    return response.cacheControl(CacheControl.noStore()).body(mapper.toDto(result.association()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<Void> deletePushSubscription(UUID accountId, UUID subscriptionId, Boolean bypass) {
    NotificationContext owner = request.owner(accountId);
    request.validateQuery(http, false);
    changes.remove(owner, subscriptionId);
    return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
  }
}
