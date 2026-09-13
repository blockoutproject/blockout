package com.blockout.backend.identity.subscription.application;

import com.blockout.backend.identity.subscription.domain.*;
import java.time.Instant;

/**
 * Public application projection with no external customer identifiers.
 *
 * @param state current access decision
 * @param verifiedAt last complete observation, nullable
 * @param usableUntil exclusive local access deadline, nullable
 * @param refreshState whether refresh is idle, pending or failed
 * @param failure safe provider classification, nullable
 */
public record SubscriptionView(
    SubscriptionState state,
    Instant verifiedAt,
    Instant usableUntil,
    RefreshState refreshState,
    SubscriptionFailure failure) {
  /** Running and queued work are both pending at the application boundary. */
  public enum RefreshState {
    IDLE,
    PENDING,
    FAILED
  }
}
