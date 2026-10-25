package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingReadService;
import java.time.Instant;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.event.Level;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * F01 committed current evidence in F13's native ECS stream. No alert state, notification history
 * or automatic recovery is retained. Bounded informational reports share the same stream.
 */
@Component
@Slf4j
public class CollectionOperationalDiagnostics {
  private static final long REPORT_LIMIT = 10_000;
  private final CollectionStore store;
  private final SeasonService seasons;
  private final SportingReadService sporting;
  private final TransactionTemplate reads;

  /** Stable result key whose committed state needs diagnosis, without copying provider data. */
  public record EvidenceChanged(
      UUID controlId, UUID scopeId, CollectionStageEnum stage, CollectionPhaseEnum phase) {}

  /** Accepted catalog evidence requiring a current aggregate classification report. */
  public record CatalogObserved(UUID controlId) {}

  /** Accepted seasonal entry requiring a current aggregate preparation report. */
  public record SourceObserved(UUID seasonId, CollectionProviderEnum provider) {}

  /**
   * Uses native new transactions after commit; locks serialize log snapshots with result writes.
   *
   * @param store current F01 state owner
   * @param seasons canonical season lock owner
   * @param sporting current effective acquisition-classification reads
   * @param transactions existing application transaction manager
   */
  public CollectionOperationalDiagnostics(
      CollectionStore store,
      SeasonService seasons,
      SportingReadService sporting,
      PlatformTransactionManager transactions) {
    this.store = store;
    this.seasons = seasons;
    this.sporting = sporting;
    this.reads = new TransactionTemplate(transactions);
    this.reads.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }

  /**
   * Rereads under the season/control locks so a delayed callback cannot log superseded evidence.
   * Routine successful scopes produce no event; failure and actual recovery remain diagnosable.
   *
   * @param event committed stable result key
   */
  @TransactionalEventListener
  public void evidence(EvidenceChanged event) {
    diagnose(
        () -> {
          Control control = lockControl(event.controlId());
          CollectionResult result =
              store
                  .result(control.id(), event.scopeId(), event.stage(), event.phase())
                  .orElseThrow();
          boolean success = result.outcome() == CollectionOutcomeEnum.SUCCESS;
          boolean structural = result.firstStructuralFailureAt() != null;
          boolean delayed =
              !structural
                  && result.phase() == CollectionPhaseEnum.ACQUISITION
                  && (control.family() == CollectionFamilyEnum.CLUB_SHEETS
                      || control.family() == CollectionFamilyEnum.GEOCODING);
          Instant alertAt =
              success
                  ? null
                  : structural
                      ? result.firstStructuralFailureAt()
                      : result.firstFailureAt().plusSeconds(delayed ? 86_400 : 0);
          log.atLevel(success ? Level.INFO : Level.WARN)
              .addKeyValue("operation", "collection_evidence")
              .addKeyValue("collection_control", control.id())
              .addKeyValue("scope", result.scopeId())
              .addKeyValue("stage", result.stage().getValue())
              .addKeyValue("phase", result.phase().getValue())
              .addKeyValue("provider", provider(control.family()))
              .addKeyValue("collection_season", control.seasonId())
              .addKeyValue("outcome", result.outcome().getValue())
              .addKeyValue(
                  "reason",
                  success
                      ? "usable-observation"
                      : CollectionResultService.isStructuralReason(result.reasonType())
                          ? "structure-or-context"
                          : "failed-observation")
              .addKeyValue("collection_cycle_order", result.cycleOrder())
              .addKeyValue("collection_read_ordinal", result.readOrdinal())
              .addKeyValue("collection_observed_at", result.observedAt())
              .addKeyValue("collection_first_failure_at", result.firstFailureAt())
              .addKeyValue(
                  "collection_first_structural_failure_at", result.firstStructuralFailureAt())
              .addKeyValue("collection_alert_at", epoch(alertAt))
              .addKeyValue("last_success_at", result.lastSuccessAt())
              .addKeyValue("affected_count", bounded(result.obtainedCount()))
              .addKeyValue("partial_count", bounded(result.rejectedCount()))
              .log("Current scoped collection evidence");
        });
  }

  /**
   * Reports outstanding settings after accepted catalog integration, including partial outcomes. No
   * provider outage is inferred from waiting for operator classification.
   *
   * @param event committed catalog owner
   */
  @TransactionalEventListener
  public void catalog(CatalogObserved event) {
    diagnose(
        () -> {
          Control control = lockControl(event.controlId());
          if (control.seasonId() == null) return;
          CollectionProviderEnum provider =
              control.family() == CollectionFamilyEnum.LNV
                  ? CollectionProviderEnum.LNV
                  : CollectionProviderEnum.FFVB;
          report(
              control.seasonId(),
              provider,
              "classification",
              sporting.countUnclassifiedPools(control.seasonId(), provider));
        });
  }

  /**
   * Groups accepted seasonal proposals by current provider/season preparation need, including zero
   * after launch. Repeated discovery uses Grafana grouping instead of a sent-report ledger.
   *
   * @param event accepted discovery scope
   */
  @TransactionalEventListener
  public void source(SourceObserved event) {
    diagnose(
        () -> {
          seasons.lockCollectionState(event.seasonId());
          long pending = store.countUnlaunchedSources(event.seasonId(), event.provider());
          report(event.seasonId(), event.provider(), "season-preparation", pending);
        });
  }

  /**
   * Acquires only the existing season/control lock order; it writes no domain state.
   *
   * @param controlId current evidence owner
   * @return locked current control, even when paused or closed
   */
  private Control lockControl(UUID controlId) {
    Control control = store.control(controlId).orElseThrow();
    if (control.seasonId() != null) seasons.lockCollectionState(control.seasonId());
    return store.lockControl(controlId);
  }

  /**
   * Emits one aggregate snapshot without per-item identities or personal values.
   *
   * @param seasonId canonical nonpersonal season
   * @param provider catalog authority
   * @param subject fixed preparation or classification subject
   * @param count measured current need, capped for reporting
   */
  private void report(UUID seasonId, CollectionProviderEnum provider, String subject, long count) {
    log.atInfo()
        .addKeyValue("operation", "collection_operator_report")
        .addKeyValue("provider", provider.getValue())
        .addKeyValue("collection_season", seasonId)
        .addKeyValue("collection_subject", subject)
        .addKeyValue("collection_destination", "/administration")
        .addKeyValue("affected_count", Math.min(count, REPORT_LIMIT))
        .addKeyValue("collection_count_capped", count > REPORT_LIMIT)
        .log("Current grouped collection administration needs");
  }

  /**
   * Keeps diagnostic failures outside the committed business outcome; ordinary future observations
   * may supply later evidence. No retry, outbox or delivery guarantee is introduced.
   *
   * @param read owner-specific current evidence read and safe log emission
   */
  private void diagnose(Runnable read) {
    try {
      reads.executeWithoutResult(status -> read.run());
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
   * @param family current control family
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

  /**
   * Supplies a numeric LogQL deadline; zero denotes a new usable observation at this exact key.
   *
   * @param instant first failure's actionable instant, or null after recovery
   * @return epoch seconds with subsecond evidence retained for threshold evaluation
   */
  private double epoch(Instant instant) {
    return instant == null ? 0 : instant.getEpochSecond() + instant.getNano() / 1_000_000_000.0;
  }
}
