package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.openapitools.jackson.nullable.JsonNullable;
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
  private final LnvAcquisition lnv;
  private final ClubSheets clubs;
  private final ClubGeocoder geocoder;
  private final DiscoverSeasonSources discovery;
  private final CollectorLifecycle lifecycle;
  private final Clock clock;
  private final CollectionStageMapper stageMapper;

  /**
   * Executes supported stages from the frozen selection and attempts ordinary completion. Only
   * target metadata is grouped across pages; provider bodies live for one shared resource at a
   * time.
   *
   * @param context backend-confirmed control capability; source validation has a separate owner
   */
  public void execute(CollectorLifecycle.AdmittedCycle context) {
    if (context.getCycle().controlId() == null) {
      throw new IllegalArgumentException("A control passage is required");
    }
    try {
      List<CollectionBackend.Target> selected = frozenSelection(context);
      SeasonalResources resources = new SeasonalResources(context, selected);
      Map<UUID, Set<UUID>> reconciledPools = new LinkedHashMap<>();
      for (CollectionBackend.Target target : selected) {
        if (target.kind() == CollectionTargetKindEnum.DISCOVERY) {
          // A shared page can submit sporting data before either catalogue phase is recorded.
          Set<UUID> present =
              readAndSubmitCatalog(
                  context, target, page -> resources.consumeSharedPage(target.provider(), page));
          if (present != null) {
            reconciledPools.put(target.sourceBindingId(), present);
          }
        }
      }
      resources.collectRemaining(reconciledPools);
      for (CollectionBackend.Target target : selected) {
        if (target.provider() == CollectionProviderEnum.LNV
            && target.kind() == CollectionTargetKindEnum.DETAILS
            && remainsPresent(target, reconciledPools)) {
          resources.enrichment.collectDetailOnce(target);
        }
      }
      for (CollectionBackend.Target target : selected) {
        if ((target.kind() == CollectionTargetKindEnum.CLUB_SHEET
                || target.kind() == CollectionTargetKindEnum.GEOCODING)
            && remainsPresent(target, reconciledPools)) {
          seasonless(context, target);
        }
      }
      resources.enrichment.flushEvidence();
      lifecycle.complete(context, clock.instant());
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() != CollectionBackendFailure.Kind.CONFLICT) {
        throw failure;
      }
      lifecycle.inspectConflict(failure);
      log.atWarn()
          .addKeyValue("operation", "collection_passage")
          .addKeyValue("cycleId", context.getCycle().id())
          .addKeyValue("outcome", "refused")
          .log("Admitted context was refused; no further reads or completion were attempted");
    }
  }

  private List<CollectionBackend.Target> frozenSelection(CollectorLifecycle.AdmittedCycle context) {
    List<CollectionBackend.Target> selected = new ArrayList<>();
    long page = 0;
    CollectionBackend.TargetPage targets;
    do {
      targets = backend.targets(context.getCycle().id(), page++);
      selected.addAll(targets.items());
    } while (targets.hasNext());
    return selected;
  }

  /**
   * Groups only frozen scopes. Discovery supplies decoded bodies synchronously for immediate use.
   */
  private final class SeasonalResources {
    private final CollectorLifecycle.AdmittedCycle context;
    private final Map<URI, List<CollectionBackend.Target>> ffvbGroups = new LinkedHashMap<>();
    private final Map<URI, List<CollectionBackend.Target>> lnvGroups = new LinkedHashMap<>();
    private final LnvEnrichment enrichment;

    private SeasonalResources(
        CollectorLifecycle.AdmittedCycle context, List<CollectionBackend.Target> selected) {
      this.context = context;
      for (CollectionBackend.Target target : selected) {
        if (target.kind() == CollectionTargetKindEnum.CALENDAR
            || target.kind() == CollectionTargetKindEnum.STANDINGS) {
          add(target);
        }
      }
      enrichment = new LnvEnrichment(context, !lnvGroups.isEmpty());
    }

    private void add(CollectionBackend.Target target) {
      // Choose the publisher before interpreting its resource key.
      List<CollectionBackend.Target> scopes =
          switch (target.provider()) {
            case FFVB ->
                ffvbGroups.computeIfAbsent(ffvb.resourceUrl(target), ignored -> new ArrayList<>());
            case LNV -> lnvGroups.computeIfAbsent(target.url(), ignored -> new ArrayList<>());
          };
      scopes.add(target);
    }

    private void consumeSharedPage(
        CollectionProviderEnum provider, DiscoverSeasonSources.PageRead page) {
      URI url = page.response().url();
      switch (provider) {
        case FFVB -> {
          List<CollectionBackend.Target> scopes = ffvbGroups.remove(url);
          if (scopes != null) {
            consumeFfvb(
                context, scopes, ffvb.fromPage(page.response(), page.observedAt()), page.ordinal());
          }
        }
        case LNV -> {
          List<CollectionBackend.Target> scopes = lnvGroups.remove(url);
          if (scopes != null) {
            consumeLnv(
                context,
                scopes,
                lnv.fromPage(page.response(), page.observedAt()),
                page.ordinal(),
                enrichment);
          }
        }
      }
    }

    private void collectRemaining(Map<UUID, Set<UUID>> reconciledPools) {
      collectRemaining(ffvbGroups, reconciledPools, this::readFfvb);
      collectRemaining(lnvGroups, reconciledPools, this::readLnv);
    }

    private void collectRemaining(
        Map<URI, List<CollectionBackend.Target>> groups,
        Map<UUID, Set<UUID>> reconciledPools,
        BiConsumer<URI, List<CollectionBackend.Target>> read) {
      for (Map.Entry<URI, List<CollectionBackend.Target>> entry : groups.entrySet()) {
        List<CollectionBackend.Target> scopes =
            entry.getValue().stream()
                .filter(target -> remainsPresent(target, reconciledPools))
                .toList();
        if (!scopes.isEmpty()) {
          read.accept(entry.getKey(), scopes);
        }
      }
    }

    private void readFfvb(URI url, List<CollectionBackend.Target> scopes) {
      long ordinal = context.nextReadOrdinal();
      FfvbAcquisition.Resource resource;
      try {
        resource = ffvb.read(url);
      } catch (RuntimeException failure) {
        scopes.forEach(target -> acquisitionFailed(context, target, ordinal, failure));
        return;
      }
      consumeFfvb(context, scopes, resource, ordinal);
    }

    private void readLnv(URI url, List<CollectionBackend.Target> scopes) {
      long ordinal = context.nextReadOrdinal();
      LnvAcquisition.Resource resource;
      try {
        resource = lnv.read(url);
      } catch (RuntimeException failure) {
        scopes.forEach(target -> acquisitionFailed(context, target, ordinal, failure));
        return;
      }
      consumeLnv(context, scopes, resource, ordinal, enrichment);
    }
  }

  /**
   * Acquires one seasonless target with its original current locality revision. A null permitted
   * municipality means no provider call or attempt evidence; technical failures submit no F02
   * withdrawal and independent clubs may still proceed. Reports acquisition and F02 acceptance
   * separately, preserving partial field refusals and never replaying an uncertain mutation.
   *
   * @param context admitted seasonless capability
   * @param target exact club and currently permitted context from the target read
   */
  private void seasonless(
      CollectorLifecycle.AdmittedCycle context, CollectionBackend.Target target) {
    if (target.kind() == CollectionTargetKindEnum.GEOCODING && target.municipality() == null) {
      return;
    }
    lifecycle.requireActive();
    long ordinal = context.nextReadOrdinal();
    SportingObservation.Club sheet;
    SportingObservation.Locality point;
    try {
      if (target.kind() == CollectionTargetKindEnum.CLUB_SHEET) {
        sheet = clubs.read(target.clubReference());
        point = null;
      } else {
        sheet = null;
        point =
            geocoder.read(
                target.address(),
                target.municipality(),
                target.postalCode(),
                target.localityRevision());
      }
    } catch (RuntimeException failure) {
      acquisitionFailed(context, target, ordinal, failure);
      return;
    }
    Instant observedAt = clock.instant();
    record(
        context,
        target,
        ordinal,
        CollectionPhaseEnum.ACQUISITION,
        CollectionOutcomeEnum.SUCCESS,
        null,
        null,
        observedAt,
        point == null ? null : "IGN location: " + point.outcome().getValue());
    SportingObservation.Context evidence = sourceContext(context, ordinal, observedAt);
    lifecycle.requireActive();
    CollectionStageEnum stage = stageMapper.toStage(target.kind());
    SportingObservation.Outcome outcome =
        submitOnce(
            context,
            target.scopeId(),
            stage,
            ordinal,
            () ->
                target.kind() == CollectionTargetKindEnum.CLUB_SHEET
                    ? sporting.club(target.clubId(), evidence, sheet)
                    : sporting.locality(target.clubId(), evidence, point));
    if (outcome == null) {
      return;
    }
    URI reasonType = outcome.reasonType();
    CollectionOutcomeEnum result =
        accepted(outcome)
            ? (reasonType == null ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.PARTIAL)
            : CollectionOutcomeEnum.FAILED;
    if (reasonType != null) {
      recordIntegration(context, target.scopeId(), stage, ordinal, result, null, null, reasonType);
    } else {
      record(
          context,
          target,
          ordinal,
          CollectionPhaseEnum.INTEGRATION,
          result,
          null,
          null,
          clock.instant(),
          outcome.outcome().getValue());
    }
  }

  /**
   * Applies newly confirmed absence to all remaining reads in the frozen selection.
   *
   * @param target originally admitted scope
   * @param presentPools only successfully reconciled seasonal catalogs
   * @return whether no complete catalog has removed this scope
   */
  private boolean remainsPresent(
      CollectionBackend.Target target, Map<UUID, Set<UUID>> presentPools) {
    return target.poolId() == null
        || !presentPools.containsKey(target.sourceBindingId())
        || presentPools.get(target.sourceBindingId()).contains(target.poolId());
  }

  /**
   * Consumes selected FFVB scopes immediately, discarding the shared page afterward.
   *
   * @param context admitted passage
   * @param scopes already eligible targets only
   * @param resource shared provider read
   * @param ordinal original pre-read order
   */
  private void consumeFfvb(
      CollectorLifecycle.AdmittedCycle context,
      List<CollectionBackend.Target> scopes,
      FfvbAcquisition.Resource resource,
      long ordinal) {
    for (CollectionBackend.Target target : scopes) {
      lifecycle.requireActive();
      if (target.kind() == CollectionTargetKindEnum.CALENDAR) {
        calendar(context, target, resource, ordinal);
      } else {
        standings(context, target, resource, ordinal);
      }
    }
  }

  /**
   * Consumes selected professional scopes without retaining other groups' sporting rows.
   *
   * @param context admitted passage
   * @param scopes already eligible targets only
   * @param resource shared provider read
   * @param ordinal original pre-read order
   * @param enrichment optional LNV work owned by this passage
   */
  private void consumeLnv(
      CollectorLifecycle.AdmittedCycle context,
      List<CollectionBackend.Target> scopes,
      LnvAcquisition.Resource resource,
      long ordinal,
      LnvEnrichment enrichment) {
    for (CollectionBackend.Target target : scopes) {
      lifecycle.requireActive();
      if (target.kind() == CollectionTargetKindEnum.CALENDAR) {
        enrichment.calendar(target, resource, ordinal);
      } else {
        LnvAcquisition.Read<SportingObservation.Standings> read;
        try {
          read = resource.standings(target);
        } catch (RuntimeException failure) {
          acquisitionFailed(context, target, ordinal, failure);
          continue;
        }
        submitStandings(context, target, ordinal, read.observation(), read.observedAt());
      }
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
    submitCalendar(context, target, ordinal, read.observation(), read.observedAt());
  }

  /**
   * Submits independent calendar acquisition and integration evidence without a write retry.
   *
   * @param context admitted passage
   * @param target selected pool
   * @param ordinal original read order
   * @param observation interpreted calendar
   * @param observedAt actual source read time
   * @return confirmed resolved identities, or null after unconfirmed/refused transport
   */
  private SportingObservation.CalendarOutcome submitCalendar(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      long ordinal,
      SportingObservation.Calendar observation,
      Instant observedAt) {
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
    CollectionStageEnum stage = stageMapper.toStage(target.kind());
    SportingObservation.CalendarOutcome outcome =
        submitOnce(
            context,
            target.scopeId(),
            stage,
            ordinal,
            () ->
                sporting.calendar(
                    target.poolId(), sourceContext(context, ordinal, observedAt), observation));
    if (outcome != null) {
      long accepted = outcome.acceptedCount() + outcome.unchangedCount();
      long rejected = outcome.rejectedCount() + outcome.staleCount();
      recordIntegration(
          context,
          target.scopeId(),
          stage,
          ordinal,
          measuredOutcome(accepted, rejected),
          accepted,
          rejected,
          firstRefusal(outcome.outcomes()));
    }
    return outcome;
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
    submitStandings(context, target, ordinal, read.observation(), read.observedAt());
  }

  /**
   * Retains independent official standings evidence and acceptance.
   *
   * @param context admitted passage
   * @param target selected table
   * @param ordinal original read order
   * @param observation official publication
   * @param observedAt actual source read time
   */
  private void submitStandings(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      long ordinal,
      SportingObservation.Standings observation,
      Instant observedAt) {
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
    CollectionStageEnum stage = stageMapper.toStage(target.kind());
    SportingObservation.Outcome outcome =
        submitOnce(
            context,
            target.scopeId(),
            stage,
            ordinal,
            () ->
                sporting.standings(
                    target.poolId(), sourceContext(context, ordinal, observedAt), observation));
    if (outcome != null) {
      recordIntegration(
          context,
          target.scopeId(),
          stage,
          ordinal,
          accepted(outcome) ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.FAILED,
          null,
          null,
          outcome.reasonType());
    }
  }

  /**
   * Integrates catalog presence before remaining reads; shared pages serve admitted scopes inline.
   *
   * @param context admitted passage
   * @param target selected binding
   * @param consume immediate shared-page consumer for already admitted scopes
   * @return reconciled present pool IDs, or null when absence is not established
   */
  private Set<UUID> readAndSubmitCatalog(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      Consumer<DiscoverSeasonSources.PageRead> consume) {
    long ordinal = context.nextReadOrdinal();
    DiscoverSeasonSources.Read read;
    try {
      read =
          discovery.catalog(
              target,
              context.getCycle().mode() == CollectionModeEnum.INITIAL_IMPORT,
              context::nextReadOrdinal,
              consume);
    } catch (CollectionBackendFailure failure) {
      throw failure;
    } catch (RuntimeException failure) {
      acquisitionFailed(context, target, ordinal, failure);
      return null;
    }
    record(
        context,
        new CollectionBackend.Result(
            target.scopeId(),
            CollectionStageEnum.DISCOVERY,
            CollectionPhaseEnum.ACQUISITION,
            ordinal,
            read.observedAt(),
            read.catalog().complete()
                ? CollectionOutcomeEnum.SUCCESS
                : CollectionOutcomeEnum.PARTIAL,
            read.reasonType(),
            read.reason(),
            (long) read.catalog().pools().size(),
            null));
    SportingObservation.CatalogOutcome outcome =
        submitOnce(
            context,
            target.scopeId(),
            CollectionStageEnum.DISCOVERY,
            ordinal,
            () ->
                sporting.catalog(
                    target.sourceBindingId(),
                    sourceContext(context, ordinal, read.observedAt()),
                    read.catalog()));
    if (outcome == null) {
      return null;
    }
    long accepted = outcome.outcomes().stream().filter(this::accepted).count();
    long rejected = outcome.outcomes().size() - accepted;
    recordIntegration(
        context,
        target.scopeId(),
        CollectionStageEnum.DISCOVERY,
        ordinal,
        measuredOutcome(accepted, rejected),
        accepted,
        rejected,
        firstRefusal(outcome.outcomes()));
    if (!outcome.absenceReconciled()) {
      return null;
    }
    Set<UUID> pools = new LinkedHashSet<>();
    outcome.outcomes().stream()
        .filter(this::accepted)
        .map(SportingObservation.Outcome::resourceId)
        .filter(Objects::nonNull)
        .forEach(pools::add);
    return pools;
  }

  private URI firstRefusal(List<SportingObservation.Outcome> outcomes) {
    return outcomes.stream()
        .map(SportingObservation.Outcome::reasonType)
        .filter(Objects::nonNull)
        .findFirst()
        .orElse(null);
  }

  /** Optional LNV work shares deduplication, document indexes and evidence for one passage. */
  private final class LnvEnrichment {
    private final CollectorLifecycle.AdmittedCycle context;
    private final Set<UUID> readTeams = new LinkedHashSet<>();
    private final Set<UUID> readMatches = new LinkedHashSet<>();
    private final LnvAcquisition.DocumentIndexes indexes;
    private final Map<UUID, Map<CollectionPhaseEnum, DetailTotal>> totals = new LinkedHashMap<>();

    private LnvEnrichment(CollectorLifecycle.AdmittedCycle context, boolean hasLnvResources) {
      this.context = context;
      indexes = hasLnvResources ? lnv.documentIndexes(context::nextReadOrdinal) : null;
    }

    /**
     * Uses only backend-resolved identities for first details and once-per-team media reads.
     *
     * @param target admitted pool
     * @param resource one shared provider page
     * @param ordinal pre-read order
     */
    private void calendar(
        CollectionBackend.Target target, LnvAcquisition.Resource resource, long ordinal) {
      LnvAcquisition.Calendar read;
      try {
        read = resource.calendar(target);
      } catch (RuntimeException failure) {
        acquisitionFailed(context, target, ordinal, failure);
        return;
      }
      SportingObservation.CalendarOutcome outcome =
          submitCalendar(context, target, ordinal, read.observation(), read.observedAt());
      if (outcome == null) {
        return;
      }
      Map<String, SportingObservation.Match> matches = new LinkedHashMap<>();
      read.observation()
          .matches()
          .forEach(match -> matches.put(match.nativeMatchReference(), match));
      for (SportingObservation.Outcome item : outcome.outcomes()) {
        if (!accepted(item)) {
          continue;
        }
        SportingObservation.Match match = matches.get(item.sourceReference());
        if (match == null) {
          continue;
        }
        if (Boolean.TRUE.equals(item.created())
            && item.resourceId() != null
            && match.detailUrl() != null) {
          collectDetailOnce(
              target.toBuilder()
                  .scopeId(item.resourceId())
                  .matchId(item.resourceId())
                  .kind(CollectionTargetKindEnum.DETAILS)
                  .nativeMatchReference(match.nativeMatchReference())
                  .url(match.detailUrl())
                  .build());
        }
        image(item.homeTeamId(), read.logos().get(match.home().nativeTeamReference()));
        image(item.awayTeamId(), read.logos().get(match.away().nativeTeamReference()));
      }
      informationSheets(target, read, outcome);
    }

    /**
     * Sends only qualified auxiliary codes, keeping the original index timestamp on reused bytes.
     *
     * @param target admitted calendar owner
     * @param calendar independently acquired sporting identities and dates
     * @param outcome actual F02 identity resolutions
     */
    private void informationSheets(
        CollectionBackend.Target target,
        LnvAcquisition.Calendar calendar,
        SportingObservation.CalendarOutcome outcome) {
      long ordinal = context.nextReadOrdinal();
      LnvAcquisition.DocumentRead read;
      try {
        read = indexes.informationSheets(target, calendar);
      } catch (RuntimeException failure) {
        for (SportingObservation.Outcome item : outcome.outcomes()) {
          if (accepted(item) && item.resourceId() != null) {
            addEvidence(
                item.resourceId(),
                ordinal,
                CollectionPhaseEnum.ACQUISITION,
                CollectionOutcomeEnum.FAILED,
                clock.instant(),
                AcquisitionFailure.reasonType(failure),
                "Information-sheet index: " + AcquisitionFailure.diagnostic(failure));
          }
        }
        return;
      }
      if (read == null) {
        return;
      }
      ordinal = read.readOrdinal();
      for (SportingObservation.Outcome item : outcome.outcomes()) {
        SportingObservation.InformationSheet sheet = read.observation().get(item.sourceReference());
        if (!accepted(item) || item.resourceId() == null || sheet == null) {
          continue;
        }
        lifecycle.requireActive();
        addEvidence(
            item.resourceId(),
            ordinal,
            CollectionPhaseEnum.ACQUISITION,
            CollectionOutcomeEnum.SUCCESS,
            read.observedAt(),
            null,
            null);
        submitDetail(
            item.resourceId(),
            ordinal,
            read.observedAt(),
            SportingObservation.Facts.builder().informationSheet(JsonNullable.of(sheet)).build(),
            "Information-sheet association: ");
      }
    }

    /**
     * Acquires a known match independently from calendar or standings success.
     *
     * @param target selected or newly resolved professional match
     */
    private void collectDetailOnce(CollectionBackend.Target target) {
      if (!readMatches.add(target.matchId())) {
        return;
      }
      long ordinal = context.nextReadOrdinal();
      LnvAcquisition.Resource resource;
      try {
        resource = lnv.read(target.url());
      } catch (RuntimeException failure) {
        addEvidence(
            target.matchId(),
            ordinal,
            CollectionPhaseEnum.ACQUISITION,
            CollectionOutcomeEnum.FAILED,
            clock.instant(),
            AcquisitionFailure.reasonType(failure),
            AcquisitionFailure.diagnostic(failure));
        return;
      }
      for (int part = 0; part < 3; part++) {
        if (part > 0) {
          ordinal = context.nextReadOrdinal();
        }
        LnvAcquisition.Read<SportingObservation.Facts> read;
        try {
          read =
              switch (part) {
                case 0 -> resource.detail(target);
                case 1 -> resource.document(target, "Scoresheet");
                default -> resource.document(target, "DataVolley");
              };
        } catch (RuntimeException failure) {
          addEvidence(
              target.matchId(),
              ordinal,
              CollectionPhaseEnum.ACQUISITION,
              CollectionOutcomeEnum.FAILED,
              clock.instant(),
              AcquisitionFailure.reasonType(failure),
              AcquisitionFailure.diagnostic(failure));
          continue;
        }
        if (read == null) {
          continue;
        }
        addEvidence(
            target.matchId(),
            ordinal,
            CollectionPhaseEnum.ACQUISITION,
            read.complete() ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.PARTIAL,
            read.observedAt(),
            read.complete() ? null : URI.create("urn:blockout:acquisition:structure"),
            read.complete() ? null : "Invalid independent detail fields");
        submitDetail(target.matchId(), ordinal, read.observedAt(), read.observation(), "");
      }
    }

    /** Accumulates one detail write with its independent document or match evidence. */
    private void submitDetail(
        UUID match,
        long ordinal,
        Instant observedAt,
        SportingObservation.Facts observation,
        String diagnosticPrefix) {
      try {
        SportingObservation.Outcome outcome =
            sporting.detail(match, sourceContext(context, ordinal, observedAt), observation);
        boolean accepted = accepted(outcome);
        URI reasonType = outcome.reasonType();
        String reason = reasonType == null ? null : reasonType.toString();
        if (!accepted && !diagnosticPrefix.isEmpty()) {
          reason = diagnosticPrefix + (reason == null ? outcome.outcome().toString() : reason);
        }
        addEvidence(
            match,
            ordinal,
            CollectionPhaseEnum.INTEGRATION,
            accepted ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.FAILED,
            clock.instant(),
            reasonType,
            reason);
      } catch (CollectionBackendFailure failure) {
        if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) {
          throw failure;
        }
        addEvidence(
            match,
            ordinal,
            CollectionPhaseEnum.INTEGRATION,
            failed(failure),
            clock.instant(),
            null,
            diagnosticPrefix + AcquisitionFailure.diagnostic(failure));
      }
    }

    /**
     * Reports cumulative measured parts through the existing per-match DETAILS stage.
     *
     * @param match resolved F02 match identity
     * @param ordinal original source-read order
     * @param phase independent acquisition or integration phase
     * @param outcome one actual part's outcome
     * @param observedAt original observation or integration completion time
     * @param reasonType original typed refusal, absent for unclassified failures
     * @param reason safe failure diagnostic, retained across later successes
     */
    private void addEvidence(
        UUID match,
        long ordinal,
        CollectionPhaseEnum phase,
        CollectionOutcomeEnum outcome,
        Instant observedAt,
        URI reasonType,
        String reason) {
      DetailTotal total =
          totals
              .computeIfAbsent(match, ignored -> new LinkedHashMap<>())
              .computeIfAbsent(phase, ignored -> new DetailTotal());
      if (outcome == CollectionOutcomeEnum.SUCCESS || outcome == CollectionOutcomeEnum.PARTIAL) {
        total.obtained++;
      }
      if (outcome != CollectionOutcomeEnum.SUCCESS) {
        total.rejected++;
        total.reason = reason;
        if (reasonType != null) {
          total.reasonType = reasonType;
        }
      }
      total.unconfirmed |= outcome == CollectionOutcomeEnum.UNCONFIRMED;
      if (ordinal >= total.readOrdinal) {
        total.readOrdinal = ordinal;
        total.observedAt = observedAt;
      }
    }

    /**
     * Publishes each stable match/phase once after its independent parts have completed, so reused
     * older XML cannot hide a refusal behind an already recorded newer detail ordinal.
     */
    private void flushEvidence() {
      for (Map.Entry<UUID, Map<CollectionPhaseEnum, DetailTotal>> match : totals.entrySet()) {
        for (Map.Entry<CollectionPhaseEnum, DetailTotal> phase : match.getValue().entrySet()) {
          DetailTotal total = phase.getValue();
          CollectionOutcomeEnum outcome = measuredOutcome(total.obtained, total.rejected);
          if (total.unconfirmed) {
            outcome = CollectionOutcomeEnum.UNCONFIRMED;
          }
          record(
              context,
              new CollectionBackend.Result(
                  match.getKey(),
                  CollectionStageEnum.DETAILS,
                  phase.getKey(),
                  total.readOrdinal,
                  total.observedAt,
                  outcome,
                  total.reasonType,
                  total.reason,
                  total.obtained,
                  total.rejected));
        }
      }
    }

    /**
     * Uploads only a new supplier image read, using its original bounded bytes directly.
     *
     * @param team backend-resolved team, absent on rejected identity
     * @param url published native image, absent when unpublished
     */
    private void image(UUID team, URI url) {
      if (team == null || url == null || !readTeams.add(team)) {
        return;
      }
      long ordinal = context.nextReadOrdinal();
      LnvAcquisition.Read<byte[]> read;
      try {
        read = lnv.image(url);
      } catch (RuntimeException failure) {
        record(
            context,
            team,
            CollectionStageEnum.LOGO,
            ordinal,
            CollectionPhaseEnum.ACQUISITION,
            CollectionOutcomeEnum.FAILED,
            null,
            null,
            clock.instant(),
            AcquisitionFailure.diagnostic(failure));
        return;
      }
      if (read == null) {
        return;
      }
      record(
          context,
          team,
          CollectionStageEnum.LOGO,
          ordinal,
          CollectionPhaseEnum.ACQUISITION,
          CollectionOutcomeEnum.SUCCESS,
          null,
          null,
          read.observedAt(),
          null);
      SportingObservation.Outcome outcome =
          submitOnce(
              context,
              team,
              CollectionStageEnum.LOGO,
              ordinal,
              () ->
                  sporting.logo(
                      team,
                      sourceContext(context, ordinal, read.observedAt()),
                      read.observation()));
      if (outcome != null) {
        recordIntegration(
            context,
            team,
            CollectionStageEnum.LOGO,
            ordinal,
            accepted(outcome) ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.FAILED,
            null,
            null,
            outcome.reasonType());
      }
    }
  }

  /** Measured independent parts for one match and one phase, discarded at passage completion. */
  private static final class DetailTotal {
    private long readOrdinal;
    private Instant observedAt;
    private long obtained;
    private long rejected;
    private boolean unconfirmed;
    private URI reasonType;
    private String reason;
  }

  /**
   * Recognizes only explicit F02 acceptance or unchanged identity outcomes.
   *
   * @param outcome actual F02 response
   * @return whether this identity was accepted
   */
  private boolean accepted(SportingObservation.Outcome outcome) {
    return outcome.outcome() == ObservationOutcomeEnum.ACCEPTED
        || outcome.outcome() == ObservationOutcomeEnum.UNCHANGED;
  }

  /**
   * Classifies measured parts consistently for catalogs, calendars and cumulative detail evidence.
   *
   * @param obtained usable or unchanged parts
   * @param rejected unusable or refused parts
   * @return success with no rejection, otherwise failure or partial success according to usable
   *     parts
   */
  private CollectionOutcomeEnum measuredOutcome(long obtained, long rejected) {
    if (rejected == 0) {
      return CollectionOutcomeEnum.SUCCESS;
    }
    if (obtained == 0) {
      return CollectionOutcomeEnum.FAILED;
    }
    return CollectionOutcomeEnum.PARTIAL;
  }

  /**
   * Records the failed observation through its backend owner. If that write is unconfirmed, keeps
   * the original safe cause here for investigation while independent scopes may proceed.
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
    URI reasonType = AcquisitionFailure.reasonType(failure);
    boolean confirmed =
        record(
            context,
            new CollectionBackend.Result(
                target.scopeId(),
                stageMapper.toStage(target.kind()),
                CollectionPhaseEnum.ACQUISITION,
                ordinal,
                clock.instant(),
                CollectionOutcomeEnum.FAILED,
                reasonType,
                AcquisitionFailure.reason(failure),
                null,
                null));
    if (!confirmed) {
      log.atWarn()
          .addKeyValue("operation", "collection_acquisition")
          .addKeyValue("cycleId", context.getCycle().id())
          .addKeyValue("scope", target.scopeId())
          .addKeyValue("stage", target.kind().getValue())
          .addKeyValue("reason", AcquisitionFailure.diagnostic(failure))
          .log("Failed source observation has no confirmed backend evidence");
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

  private SportingObservation.Context sourceContext(
      CollectorLifecycle.AdmittedCycle context, long ordinal, Instant observedAt) {
    return new SportingObservation.Context(context.getCycle().id(), ordinal, observedAt, null);
  }

  /**
   * Attempts one sporting write. Only loss of the admitted context stops independent work.
   *
   * @return confirmed response, or null after recording a refused or unconfirmed exchange
   */
  private <T> T submitOnce(
      CollectorLifecycle.AdmittedCycle context,
      UUID scope,
      CollectionStageEnum stage,
      long ordinal,
      Supplier<T> submit) {
    try {
      return submit.get();
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) {
        throw failure;
      }
      record(
          context,
          scope,
          stage,
          ordinal,
          CollectionPhaseEnum.INTEGRATION,
          failed(failure),
          null,
          null,
          clock.instant(),
          AcquisitionFailure.diagnostic(failure));
      return null;
    }
  }

  /**
   * Preserves F02's typed content refusal independently from unavailable integration transport.
   *
   * @param context admitted passage
   * @param scope actual sporting or source owner
   * @param stage independently integrated role
   * @param ordinal original source-read order
   * @param outcome measured F02 acceptance or refusal
   * @param obtained accepted items, or unknown
   * @param rejected refused items, or unknown
   * @param reasonType original safe F02 problem type; no diagnostic wording is parsed
   */
  private void recordIntegration(
      CollectorLifecycle.AdmittedCycle context,
      UUID scope,
      CollectionStageEnum stage,
      long ordinal,
      CollectionOutcomeEnum outcome,
      Long obtained,
      Long rejected,
      URI reasonType) {
    record(
        context,
        new CollectionBackend.Result(
            scope,
            stage,
            CollectionPhaseEnum.INTEGRATION,
            ordinal,
            clock.instant(),
            outcome,
            reasonType,
            reasonType == null ? null : reasonType.toString(),
            obtained,
            rejected));
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
    record(
        context,
        target.scopeId(),
        stageMapper.toStage(target.kind()),
        ordinal,
        phase,
        outcome,
        obtained,
        rejected,
        observedAt,
        reason);
  }

  /**
   * Records a frozen or backend-resolved child scope without inventing a collection target kind.
   *
   * @param context admitted passage
   * @param scope stable backend owner
   * @param stage actual stage
   * @param ordinal original read order
   * @param phase actual phase
   * @param outcome measured result
   * @param obtained usable count or null
   * @param rejected rejected count or null
   * @param observedAt actual phase time
   * @param reason safe diagnostic
   */
  private void record(
      CollectorLifecycle.AdmittedCycle context,
      UUID scope,
      CollectionStageEnum stage,
      long ordinal,
      CollectionPhaseEnum phase,
      CollectionOutcomeEnum outcome,
      Long obtained,
      Long rejected,
      Instant observedAt,
      String reason) {
    record(
        context,
        new CollectionBackend.Result(
            scope,
            stage,
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
  }

  /**
   * Sends one actual result once. The backend owns committed diagnostics; an unconfirmed reporting
   * exchange is logged here without repeating the underlying business mutation.
   *
   * @param context admitted control capability
   * @param result safe typed evidence including its original reason category
   * @return whether backend acceptance of the evidence was confirmed
   */
  private boolean record(
      CollectorLifecycle.AdmittedCycle context, CollectionBackend.Result result) {
    try {
      backend.record(context.getCycle().id(), result);
      return true;
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) {
        throw failure;
      }
      log.atError()
          .addKeyValue("operation", "collection_result")
          .addKeyValue("cycleId", context.getCycle().id())
          .addKeyValue("collection_control", context.getCycle().controlId())
          .addKeyValue("scope", result.scopeId())
          .addKeyValue("stage", result.stage().getValue())
          .addKeyValue("phase", result.phase().getValue())
          .addKeyValue("outcome", "unconfirmed")
          .log(
              "Current collection evidence could not be confirmed; the operation was not replayed");
      return false;
    }
  }
}
