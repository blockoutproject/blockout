package com.blockout.backend.worker.subscription;

import com.blockout.backend.identity.subscription.application.*;
import com.blockout.backend.jobs.application.*;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

/** Runs provider I/O outside SQL and returns effects for live-lease acknowledgement. */
@RequiredArgsConstructor
public final class SubscriptionJobHandler implements JobHandler {
  /** Revision/evidence owner. */
  private final Subscriptions subscriptions;

  /** Bounded external read boundary. */
  private final SubscriptionProvider provider;

  /** Conservative observation timestamp source. */
  private final Clock clock;

  /** Payload decoder. */
  private final JsonMapper json;

  /** {@inheritDoc} */
  @Override
  public String type() {
    return Subscriptions.JOB_TYPE;
  }

  /** {@inheritDoc} */
  @Override
  public int version() {
    return 1;
  }

  /** {@inheritDoc} */
  @Override
  public JobResult handle(Job job) throws InterruptedException {
    Subscriptions.RefreshPayload payload =
        json.readValue(job.payload(), Subscriptions.RefreshPayload.class);
    if (payload.userId() == null) return new JobResult.Rejected("INVALID_SUBSCRIPTION_JOB");
    Optional<SubscriptionSnapshot> found = subscriptions.snapshot(payload.userId());
    if (found.isEmpty() || !job.id().equals(found.get().jobId())) return new JobResult.Completed();
    SubscriptionSnapshot captured = found.get();
    Instant started = clock.instant();
    return switch (provider.read(captured.binding())) {
      case SubscriptionObservation.Verified verified ->
          new JobResult.SqlEffect(() -> subscriptions.verified(captured, verified, started));
      case SubscriptionObservation.Failed failed ->
          new JobResult.Failed(
              "SUBSCRIPTION_" + failed.reason().name(),
              failed.retryAfter(),
              failed.permanent(),
              () ->
                  subscriptions.failed(
                      captured, failed, failed.permanent() || job.attempts() >= job.maxAttempts()));
    };
  }
}
