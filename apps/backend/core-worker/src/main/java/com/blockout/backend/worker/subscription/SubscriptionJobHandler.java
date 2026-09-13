package com.blockout.backend.worker.subscription;

import com.blockout.backend.identity.subscription.application.*;
import com.blockout.backend.jobs.application.*;
import java.time.Clock;
import tools.jackson.databind.json.JsonMapper;

/** Runs provider I/O outside SQL and returns effects for live-lease acknowledgement. */
public final class SubscriptionJobHandler implements JobHandler {
  private final Subscriptions subscriptions;
  private final SubscriptionProvider provider;
  private final Clock clock;
  private final JsonMapper json;

  /**
   * Connects durable payloads to the subscription owner.
   *
   * @param subscriptions revision/evidence owner
   * @param provider bounded external read boundary
   * @param clock conservative observation timestamp source
   * @param json payload decoder
   */
  public SubscriptionJobHandler(
      Subscriptions subscriptions, SubscriptionProvider provider, Clock clock, JsonMapper json) {
    this.subscriptions = subscriptions;
    this.provider = provider;
    this.clock = clock;
    this.json = json;
  }

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
    var payload = json.readValue(job.payload(), Subscriptions.RefreshPayload.class);
    if (payload.userId() == null) return new JobResult.Rejected("INVALID_SUBSCRIPTION_JOB");
    var found = subscriptions.snapshot(payload.userId());
    if (found.isEmpty() || !job.id().equals(found.get().jobId())) return new JobResult.Completed();
    var captured = found.get();
    var started = clock.instant();
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
