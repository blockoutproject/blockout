package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionStageEnum;
import com.blockout.collector.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeEnum;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Bounded admitted passage; independent failures never replay sporting writes or erase successes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CollectPassage {
  private final CollectionBackend backend;
  private final SportingBackend sporting;
  private final FfvbAcquisition ffvb;
  private final CollectorLifecycle lifecycle;
  private final Clock clock;

  /**
   * Executes supported stages from the frozen selection and attempts ordinary completion.
   *
   * @param context backend-confirmed control capability; source validation has a separate owner
   * @return whether terminal completion was confirmed, independently from stage success
   */
  public boolean execute(CollectorLifecycle.AdmittedCycle context) {
    if (context.getCycle().controlId() == null)
      throw new IllegalArgumentException("A control passage is required");
    try {
      long page = 0;
      CollectionBackend.TargetPage targets;
      do {
        targets = backend.targets(context.getCycle().id(), page++);
        for (CollectionBackend.Target target : targets.items()) {
          if (target.provider() == CollectionProviderEnum.FFVB
              && target.kind() == CollectionTargetKindEnum.CALENDAR) calendar(context, target);
          else if (target.provider() == CollectionProviderEnum.FFVB
              && target.kind() == CollectionTargetKindEnum.STANDINGS) standings(context, target);
          else
            log.atWarn()
                .addKeyValue("operation", "collection_stage")
                .addKeyValue("stage", target.kind())
                .addKeyValue("outcome", "not_read")
                .log("Selected acquisition adapter is not available; no observation was submitted");
        }
      } while (targets.hasNext());
      return lifecycle.complete(context, clock.instant());
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() != CollectionBackendFailure.Kind.CONFLICT) throw failure;
      if (!context.getCycle().incarnationId().equals(backend.current().incarnationId()))
        lifecycle.stop();
      log.atWarn()
          .addKeyValue("operation", "collection_passage")
          .addKeyValue("cycleId", context.getCycle().id())
          .addKeyValue("outcome", "refused")
          .log("Admitted context was refused; no further reads or completion were attempted");
      return false;
    }
  }

  /**
   * Acquires and submits one calendar without replaying sporting writes.
   *
   * @param context admitted capability
   * @param target exact pool context retained through both phases
   */
  private void calendar(CollectorLifecycle.AdmittedCycle context, CollectionBackend.Target target) {
    long ordinal = context.nextReadOrdinal();
    SportingObservation.Calendar observation;
    try {
      observation = ffvb.calendar(target);
    } catch (RuntimeException failure) {
      record(
          context,
          target,
          ordinal,
          CollectionPhaseEnum.ACQUISITION,
          CollectionOutcomeEnum.FAILED,
          null,
          null,
          clock.instant());
      return;
    }
    Instant observedAt = clock.instant();
    record(
        context,
        target,
        ordinal,
        CollectionPhaseEnum.ACQUISITION,
        observation.complete() ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.PARTIAL,
        (long) observation.matches().size(),
        (long) observation.failures().size(),
        observedAt);
    try {
      SportingObservation.CalendarOutcome outcome =
          sporting.calendar(
              target.poolId(),
              new SportingObservation.Context(context.getCycle().id(), ordinal, observedAt, null),
              observation);
      long accepted = outcome.acceptedCount() + outcome.unchangedCount();
      long rejected = outcome.rejectedCount() + outcome.staleCount();
      CollectionOutcomeEnum result =
          rejected == 0
              ? CollectionOutcomeEnum.SUCCESS
              : accepted == 0 ? CollectionOutcomeEnum.FAILED : CollectionOutcomeEnum.PARTIAL;
      record(
          context,
          target,
          ordinal,
          CollectionPhaseEnum.INTEGRATION,
          result,
          accepted,
          rejected,
          clock.instant());
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) throw failure;
      record(
          context,
          target,
          ordinal,
          CollectionPhaseEnum.INTEGRATION,
          failed(failure),
          null,
          null,
          clock.instant());
    }
  }

  /**
   * Acquires official standings independently from calendar success.
   *
   * @param context admitted capability
   * @param target independently selected standings scope
   */
  private void standings(
      CollectorLifecycle.AdmittedCycle context, CollectionBackend.Target target) {
    long ordinal = context.nextReadOrdinal();
    SportingObservation.Standings observation;
    try {
      observation = ffvb.standings(target);
    } catch (RuntimeException failure) {
      record(
          context,
          target,
          ordinal,
          CollectionPhaseEnum.ACQUISITION,
          CollectionOutcomeEnum.FAILED,
          null,
          null,
          clock.instant());
      return;
    }
    Instant observedAt = clock.instant();
    record(
        context,
        target,
        ordinal,
        CollectionPhaseEnum.ACQUISITION,
        CollectionOutcomeEnum.SUCCESS,
        (long) observation.rows().size(),
        0L,
        observedAt);
    try {
      SportingObservation.Outcome outcome =
          sporting.standings(
              target.poolId(),
              new SportingObservation.Context(context.getCycle().id(), ordinal, observedAt, null),
              observation);
      boolean accepted =
          outcome.outcome() == ObservationOutcomeEnum.ACCEPTED
              || outcome.outcome() == ObservationOutcomeEnum.UNCHANGED;
      record(
          context,
          target,
          ordinal,
          CollectionPhaseEnum.INTEGRATION,
          accepted ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.FAILED,
          null,
          null,
          clock.instant());
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) throw failure;
      record(
          context,
          target,
          ordinal,
          CollectionPhaseEnum.INTEGRATION,
          failed(failure),
          null,
          null,
          clock.instant());
    }
  }

  /**
   * Distinguishes a confirmed refusal from a lost acknowledgement.
   *
   * @param failure classified single exchange
   * @return honest refusal or uncertainty without a retry
   */
  private CollectionOutcomeEnum failed(CollectionBackendFailure failure) {
    return failure.getKind() == CollectionBackendFailure.Kind.UNCONFIRMED
        ? CollectionOutcomeEnum.UNCONFIRMED
        : CollectionOutcomeEnum.FAILED;
  }

  /**
   * Records only actual attempt evidence; reporting failure cannot replay the underlying operation.
   *
   * @param context admitted context
   * @param target stable owner scope
   * @param ordinal original pre-read ordinal
   * @param phase independently reported phase
   * @param outcome actual phase result
   * @param obtained measured accepted/usable items, or null
   * @param rejected measured unusable items, or null
   * @param observedAt actual completion of this phase
   */
  private void record(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      long ordinal,
      CollectionPhaseEnum phase,
      CollectionOutcomeEnum outcome,
      Long obtained,
      Long rejected,
      Instant observedAt) {
    try {
      backend.record(
          context.getCycle().id(),
          new CollectionBackend.Result(
              target.scopeId(),
              CollectionStageEnum.fromValue(target.kind().getValue()),
              phase,
              ordinal,
              observedAt,
              outcome,
              outcome == CollectionOutcomeEnum.SUCCESS
                  ? null
                  : URI.create("urn:blockout:acquisition:" + outcome.getValue()),
              null,
              obtained,
              rejected));
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) throw failure;
      log.atError()
          .addKeyValue("operation", "collection_result")
          .addKeyValue("cycleId", context.getCycle().id())
          .addKeyValue("stage", target.kind())
          .addKeyValue("phase", phase)
          .addKeyValue("outcome", "unconfirmed")
          .log(
              "Current collection evidence could not be confirmed; the operation was not replayed");
    }
  }
}
