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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
   * Executes supported stages from the frozen selection and attempts ordinary completion. Only
   * target metadata is grouped across pages; provider bodies live for one shared resource at a
   * time.
   *
   * @param context backend-confirmed control capability; source validation has a separate owner
   * @return whether terminal completion was confirmed, independently from stage success
   */
  public boolean execute(CollectorLifecycle.AdmittedCycle context) {
    if (context.getCycle().controlId() == null)
      throw new IllegalArgumentException("A control passage is required");
    try {
      Map<URI, List<CollectionBackend.Target>> resources = new LinkedHashMap<>();
      long page = 0;
      CollectionBackend.TargetPage targets;
      do {
        targets = backend.targets(context.getCycle().id(), page++);
        for (CollectionBackend.Target target : targets.items()) {
          if (target.provider() == CollectionProviderEnum.FFVB
              && (target.kind() == CollectionTargetKindEnum.CALENDAR
                  || target.kind() == CollectionTargetKindEnum.STANDINGS)) {
            resources
                .computeIfAbsent(ffvb.resourceUrl(target), ignored -> new ArrayList<>())
                .add(target);
          } else
            log.atWarn()
                .addKeyValue("operation", "collection_stage")
                .addKeyValue("stage", target.kind())
                .addKeyValue("outcome", "not_read")
                .log("Selected acquisition adapter is not available; no observation was submitted");
        }
      } while (targets.hasNext());
      for (Map.Entry<URI, List<CollectionBackend.Target>> entry : resources.entrySet()) {
        long ordinal = context.nextReadOrdinal();
        FfvbAcquisition.Resource resource;
        try {
          resource = ffvb.read(entry.getKey());
        } catch (RuntimeException failure) {
          for (CollectionBackend.Target target : entry.getValue())
            acquisitionFailed(context, target, ordinal, failure);
          continue;
        }
        for (CollectionBackend.Target target : entry.getValue()) {
          lifecycle.requireActive();
          if (target.kind() == CollectionTargetKindEnum.CALENDAR)
            calendar(context, target, resource, ordinal);
          else standings(context, target, resource, ordinal);
        }
      }
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
   * @param resource one shared read, discarded after its selected scopes
   * @param ordinal order allocated before this resource was read
   */
  private void calendar(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      FfvbAcquisition.Resource resource,
      long ordinal) {
    FfvbAcquisition.Read<SportingObservation.Calendar> read;
    try {
      read = resource.calendar(target);
    } catch (RuntimeException failure) {
      acquisitionFailed(context, target, ordinal, failure);
      return;
    }
    SportingObservation.Calendar observation = read.observation();
    Instant observedAt = read.observedAt();
    record(
        context,
        target,
        ordinal,
        CollectionPhaseEnum.ACQUISITION,
        observation.complete() ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.PARTIAL,
        (long) observation.matches().size(),
        (long) observation.failures().size(),
        observedAt,
        observation.failures().isEmpty()
            ? null
            : observation.failures().getFirst().reasonType().toString());
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
          clock.instant(),
          outcome.outcomes().stream()
              .filter(item -> item.reasonType() != null)
              .map(item -> item.reasonType().toString())
              .findFirst()
              .orElse(null));
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
          clock.instant(),
          failureReason(failure));
    }
  }

  /**
   * Acquires official standings independently from calendar success.
   *
   * @param context admitted capability
   * @param target independently selected standings scope
   * @param resource one shared read, independent of export success
   * @param ordinal order allocated before this resource was read
   */
  private void standings(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      FfvbAcquisition.Resource resource,
      long ordinal) {
    FfvbAcquisition.Read<SportingObservation.Standings> read;
    try {
      read = resource.standings(target);
    } catch (RuntimeException failure) {
      acquisitionFailed(context, target, ordinal, failure);
      return;
    }
    SportingObservation.Standings observation = read.observation();
    Instant observedAt = read.observedAt();
    record(
        context,
        target,
        ordinal,
        CollectionPhaseEnum.ACQUISITION,
        CollectionOutcomeEnum.SUCCESS,
        (long) observation.rows().size(),
        0L,
        observedAt,
        null);
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
          clock.instant(),
          outcome.reasonType() == null ? null : outcome.reasonType().toString());
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
          clock.instant(),
          failureReason(failure));
    }
  }

  /**
   * Retains a safe cause while allowing independent scopes and phases to proceed.
   *
   * @param context admitted capability
   * @param target affected stage and scope
   * @param ordinal original pre-read order
   * @param failure absorbed failure; raw messages and causes are never logged
   */
  private void acquisitionFailed(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      long ordinal,
      RuntimeException failure) {
    String reason = failureReason(failure);
    log.atWarn()
        .addKeyValue("operation", "collection_acquisition")
        .addKeyValue("cycleId", context.getCycle().id())
        .addKeyValue("scope", target.scopeId())
        .addKeyValue("stage", target.kind())
        .addKeyValue("reason", reason)
        .log("Provider observation failed; independent selected work may continue");
    record(
        context,
        target,
        ordinal,
        CollectionPhaseEnum.ACQUISITION,
        CollectionOutcomeEnum.FAILED,
        null,
        null,
        clock.instant(),
        reason);
  }

  /**
   * Keeps fixed parser diagnostics and native status/type information without exposing payloads.
   *
   * @param failure absorbed acquisition or backend failure
   * @return bounded diagnostic from trusted categories, never an arbitrary exception message
   */
  private String failureReason(RuntimeException failure) {
    if (failure instanceof FfvbAcquisitionException) return failure.getMessage();
    if (failure instanceof CollectionBackendFailure backendFailure)
      return "Backend " + backendFailure.getKind();
    return failure.getClass().getSimpleName();
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
   * @param reason safe provider or integration diagnostic, absent on success
   */
  private void record(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      long ordinal,
      CollectionPhaseEnum phase,
      CollectionOutcomeEnum outcome,
      Long obtained,
      Long rejected,
      Instant observedAt,
      String reason) {
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
              reason,
              obtained,
              rejected));
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) throw failure;
      log.atError()
          .addKeyValue("operation", "collection_result")
          .addKeyValue("cycleId", context.getCycle().id())
          .addKeyValue("scope", target.scopeId())
          .addKeyValue("stage", target.kind())
          .addKeyValue("phase", phase)
          .addKeyValue("outcome", "unconfirmed")
          .log(
              "Current collection evidence could not be confirmed; the operation was not replayed");
    }
  }
}
