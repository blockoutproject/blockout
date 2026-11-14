package com.blockout.backend.collection.application.service;

import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import java.time.Instant;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.event.Level;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** Committed observations in F13's native ECS stream; application projections own current state. */
@Component
@Slf4j
public class CollectionOperationalDiagnostics {
  private static final long REPORT_LIMIT = 10_000;

  /**
   * Safe facts captured by the accepting operation; no raw reason or provider data crosses here.
   */
  public record EvidenceChanged(
      UUID controlId,
      UUID seasonId,
      CollectionFamilyEnum family,
      UUID scopeId,
      CollectionStageEnum stage,
      CollectionPhaseEnum phase,
      long cycleOrder,
      long readOrdinal,
      Instant observedAt,
      CollectionOutcomeEnum outcome,
      Instant lastSuccessAt,
      boolean structuralReason,
      Long obtainedCount,
      Long rejectedCount) {}

  /** Catalog integration counts already measured by the accepted observation. */
  public record CatalogObserved(
      UUID seasonId,
      CollectionProviderEnum provider,
      Instant observedAt,
      Long obtainedCount,
      Long rejectedCount) {}

  /** A newly created seasonal entry requiring operator preparation. */
  public record SourceObserved(
      UUID seasonId, CollectionProviderEnum provider, Instant observedAt) {}

  /**
   * Logs failure or exact-key recovery only after commit. A late callback retains the original
   * observation rather than reading or synchronizing with a newer result.
   */
  @TransactionalEventListener
  public void evidence(EvidenceChanged event) {
    diagnose(
        () -> {
          boolean success = event.outcome() == CollectionOutcomeEnum.SUCCESS;
          log.atLevel(success ? Level.INFO : Level.WARN)
              .addKeyValue("operation", "collection_evidence")
              .addKeyValue("collection_control", event.controlId())
              .addKeyValue("scope", event.scopeId())
              .addKeyValue("stage", event.stage().getValue())
              .addKeyValue("phase", event.phase().getValue())
              .addKeyValue("provider", provider(event.family()))
              .addKeyValue("collection_season", event.seasonId())
              .addKeyValue("outcome", event.outcome().getValue())
              .addKeyValue(
                  "reason",
                  success
                      ? "usable-observation"
                      : event.structuralReason() ? "structure-or-context" : "failed-observation")
              .addKeyValue("collection_cycle_order", event.cycleOrder())
              .addKeyValue("collection_read_ordinal", event.readOrdinal())
              .addKeyValue("collection_observed_at", event.observedAt())
              .addKeyValue("collection_actionable", success ? 0 : 1)
              .addKeyValue("last_success_at", event.lastSuccessAt())
              .addKeyValue("affected_count", bounded(event.obtainedCount()))
              .addKeyValue("partial_count", bounded(event.rejectedCount()))
              .log("Committed scoped collection observation");
        });
  }

  @TransactionalEventListener
  public void catalog(CatalogObserved event) {
    diagnose(
        () ->
            report(
                event.seasonId(),
                event.provider(),
                "classification",
                event.observedAt(),
                event.obtainedCount(),
                event.rejectedCount()));
  }

  @TransactionalEventListener
  public void source(SourceObserved event) {
    diagnose(
        () ->
            report(
                event.seasonId(),
                event.provider(),
                "season-preparation",
                event.observedAt(),
                1L,
                null));
  }

  /**
   * Summarizes committed catalog activity or a new preparation need without per-item identities.
   *
   * @param seasonId canonical nonpersonal season
   * @param provider catalog authority
   * @param subject fixed preparation or classification subject
   * @param observedAt original observation time
   * @param obtainedCount measured accepted count, or null when unavailable
   * @param rejectedCount measured rejected count, or null when unavailable
   */
  private void report(
      UUID seasonId,
      CollectionProviderEnum provider,
      String subject,
      Instant observedAt,
      Long obtainedCount,
      Long rejectedCount) {
    log.atInfo()
        .addKeyValue("operation", "collection_operator_report")
        .addKeyValue("provider", provider.getValue())
        .addKeyValue("collection_season", seasonId)
        .addKeyValue("collection_subject", subject)
        .addKeyValue("collection_observed_at", observedAt)
        .addKeyValue("collection_destination", "/administration")
        .addKeyValue("affected_count", bounded(obtainedCount))
        .addKeyValue("partial_count", bounded(rejectedCount))
        .addKeyValue(
            "collection_count_capped",
            (obtainedCount != null && obtainedCount > REPORT_LIMIT)
                || (rejectedCount != null && rejectedCount > REPORT_LIMIT))
        .log("Committed collection administration observation");
  }

  /**
   * Keeps diagnostic failures outside the committed business outcome; ordinary future observations
   * may supply later evidence. No retry, outbox or delivery guarantee is introduced.
   *
   * @param emission safe log emission for an accepted observation
   */
  private void diagnose(Runnable emission) {
    try {
      emission.run();
    } catch (RuntimeException failure) {
      log.atError()
          .addKeyValue("operation", "collection_diagnostics")
          .addKeyValue("error.type", failure.getClass().getName())
          .addKeyValue("outcome", "unavailable")
          .log("Committed collection diagnostics are unavailable; inspect current state");
    }
  }

  /**
   * Maps only the finite control families to their actual source authority.
   *
   * @param family accepted observation control family
   * @return fixed provider, never a caller-supplied URL or identifier
   */
  private String provider(CollectionFamilyEnum family) {
    return switch (family) {
      case FFVB, CLUB_SHEETS -> CollectionProviderEnum.FFVB.getValue();
      case LNV -> CollectionProviderEnum.LNV.getValue();
      case GEOCODING -> "ign";
    };
  }

  /**
   * Retains unmeasured counts as absent instead of inventing zero.
   *
   * @param count measured count, or null when unavailable
   * @return bounded diagnostic count or null
   */
  private Long bounded(Long count) {
    return count == null ? null : Math.min(count, REPORT_LIMIT);
  }
}
