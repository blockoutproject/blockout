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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
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
  private final MunicipalGeocoder geocoder;
  private final DiscoverSeasonSources discovery;
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
      List<CollectionBackend.Target> selected = new ArrayList<>();
      long page = 0;
      CollectionBackend.TargetPage targets;
      do {
        targets = backend.targets(context.getCycle().id(), page++);
        selected.addAll(targets.items());
      } while (targets.hasNext());
      Map<URI, List<CollectionBackend.Target>> resources = new LinkedHashMap<>();
      Map<URI, List<CollectionBackend.Target>> professional = new LinkedHashMap<>();
      for (CollectionBackend.Target target : selected) {
        if (target.kind() == CollectionTargetKindEnum.CALENDAR
            || target.kind() == CollectionTargetKindEnum.STANDINGS) {
          if (target.provider() == CollectionProviderEnum.FFVB)
            resources
                .computeIfAbsent(ffvb.resourceUrl(target), ignored -> new ArrayList<>())
                .add(target);
          else professional.computeIfAbsent(target.url(), ignored -> new ArrayList<>()).add(target);
        }
      }
      DetailEvidence details = new DetailEvidence(context);
      Set<UUID> readTeams = new LinkedHashSet<>();
      Set<UUID> readMatches = new LinkedHashSet<>();
      LnvAcquisition.DocumentIndexes indexes =
          professional.isEmpty() ? null : lnv.documentIndexes(context::nextReadOrdinal);
      Map<UUID, Set<UUID>> presentPools = new LinkedHashMap<>();
      for (CollectionBackend.Target target : selected) {
        if (target.kind() != CollectionTargetKindEnum.DISCOVERY) continue;
        Set<UUID> present =
            discover(
                context,
                target,
                pageRead -> {
                  URI url = pageRead.response().url();
                  if (target.provider() == CollectionProviderEnum.FFVB) {
                    List<CollectionBackend.Target> scopes = resources.remove(url);
                    if (scopes != null)
                      consumeFfvb(
                          context,
                          scopes,
                          ffvb.fromPage(pageRead.response(), pageRead.observedAt()),
                          pageRead.ordinal());
                  } else {
                    List<CollectionBackend.Target> scopes = professional.remove(url);
                    if (scopes != null)
                      consumeLnv(
                          context,
                          scopes,
                          lnv.fromPage(pageRead.response(), pageRead.observedAt()),
                          pageRead.ordinal(),
                          readTeams,
                          readMatches,
                          indexes,
                          details);
                  }
                });
        if (present != null) presentPools.put(target.sourceBindingId(), present);
      }
      selected = selected.stream().filter(target -> remainsPresent(target, presentPools)).toList();
      for (Map.Entry<URI, List<CollectionBackend.Target>> entry : resources.entrySet()) {
        List<CollectionBackend.Target> scopes =
            entry.getValue().stream()
                .filter(target -> remainsPresent(target, presentPools))
                .toList();
        if (scopes.isEmpty()) continue;
        long ordinal = context.nextReadOrdinal();
        FfvbAcquisition.Resource resource;
        try {
          resource = ffvb.read(entry.getKey());
        } catch (RuntimeException failure) {
          for (CollectionBackend.Target target : scopes)
            acquisitionFailed(context, target, ordinal, failure);
          continue;
        }
        consumeFfvb(context, scopes, resource, ordinal);
      }
      for (Map.Entry<URI, List<CollectionBackend.Target>> entry : professional.entrySet()) {
        List<CollectionBackend.Target> scopes =
            entry.getValue().stream()
                .filter(target -> remainsPresent(target, presentPools))
                .toList();
        if (scopes.isEmpty()) continue;
        long ordinal = context.nextReadOrdinal();
        LnvAcquisition.Resource resource;
        try {
          resource = lnv.read(entry.getKey());
        } catch (RuntimeException failure) {
          for (CollectionBackend.Target target : scopes)
            acquisitionFailed(context, target, ordinal, failure);
          continue;
        }
        consumeLnv(context, scopes, resource, ordinal, readTeams, readMatches, indexes, details);
      }
      for (CollectionBackend.Target target : selected)
        if (target.provider() == CollectionProviderEnum.LNV
            && target.kind() == CollectionTargetKindEnum.DETAILS
            && readMatches.add(target.matchId())) detail(context, target, details);
      for (CollectionBackend.Target target : selected) {
        if (target.kind() == CollectionTargetKindEnum.CLUB_SHEET
            || target.kind() == CollectionTargetKindEnum.GEOCODING) seasonless(context, target);
      }
      details.flush();
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
   * Acquires one seasonless target with its original current locality revision. A null permitted
   * municipality means no provider call or attempt evidence; technical failures submit no F02
   * withdrawal and independent clubs may still proceed.
   *
   * @param context admitted seasonless capability
   * @param target exact club and currently permitted context from the target read
   */
  private void seasonless(
      CollectorLifecycle.AdmittedCycle context, CollectionBackend.Target target) {
    if (target.kind() == CollectionTargetKindEnum.GEOCODING && target.municipality() == null)
      return;
    lifecycle.requireActive();
    long ordinal = context.nextReadOrdinal();
    SportingObservation.Club sheet = null;
    SportingObservation.Locality point = null;
    try {
      if (target.kind() == CollectionTargetKindEnum.CLUB_SHEET)
        sheet = clubs.read(target.clubReference());
      else
        point =
            geocoder.read(target.municipality(), target.postalCode(), target.localityRevision());
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
        point == null ? null : "IGN municipality: " + point.outcome().getValue());
    SportingObservation.Context evidence =
        new SportingObservation.Context(context.getCycle().id(), ordinal, observedAt, null);
    SportingObservation.Club acquiredSheet = sheet;
    SportingObservation.Locality acquiredPoint = point;
    integrateSeasonless(
        context,
        target,
        ordinal,
        () ->
            acquiredPoint == null
                ? sporting.club(target.clubId(), evidence, acquiredSheet)
                : sporting.locality(target.clubId(), evidence, acquiredPoint));
  }

  /**
   * Reports independent F02 acceptance once; a lost response never replays its mutation.
   *
   * @param context admitted capability
   * @param target acquired club or current locality
   * @param ordinal original pre-read order
   * @param submit single F02 mutation, called exactly once
   */
  private void integrateSeasonless(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      long ordinal,
      Supplier<SportingObservation.Outcome> submit) {
    lifecycle.requireActive();
    try {
      SportingObservation.Outcome outcome = submit.get();
      record(
          context,
          target,
          ordinal,
          CollectionPhaseEnum.INTEGRATION,
          accepted(outcome) ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.FAILED,
          null,
          null,
          clock.instant(),
          outcome.reasonType() == null
              ? outcome.outcome().getValue()
              : outcome.reasonType().toString());
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
      if (target.kind() == CollectionTargetKindEnum.CALENDAR)
        calendar(context, target, resource, ordinal);
      else standings(context, target, resource, ordinal);
    }
  }

  /**
   * Consumes selected professional scopes without retaining other groups' sporting rows.
   *
   * @param context admitted passage
   * @param scopes already eligible targets only
   * @param resource shared provider read
   * @param ordinal original pre-read order
   * @param readTeams passage-local media attempts
   * @param readMatches passage-local detail attempts
   * @param details cumulative independent detail/document evidence
   * @param indexes passage-local document indexes
   */
  private void consumeLnv(
      CollectorLifecycle.AdmittedCycle context,
      List<CollectionBackend.Target> scopes,
      LnvAcquisition.Resource resource,
      long ordinal,
      Set<UUID> readTeams,
      Set<UUID> readMatches,
      LnvAcquisition.DocumentIndexes indexes,
      DetailEvidence details) {
    for (CollectionBackend.Target target : scopes) {
      lifecycle.requireActive();
      if (target.kind() == CollectionTargetKindEnum.CALENDAR) {
        professionalCalendar(
            context, target, resource, ordinal, readTeams, readMatches, indexes, details);
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
    try {
      SportingObservation.CalendarOutcome outcome =
          sporting.calendar(
              target.poolId(),
              new SportingObservation.Context(context.getCycle().id(), ordinal, observedAt, null),
              observation);
      long accepted = outcome.acceptedCount() + outcome.unchangedCount();
      long rejected = outcome.rejectedCount() + outcome.staleCount();
      record(
          context,
          target,
          ordinal,
          CollectionPhaseEnum.INTEGRATION,
          measuredOutcome(accepted, rejected),
          accepted,
          rejected,
          clock.instant(),
          outcome.outcomes().stream()
              .filter(item -> item.reasonType() != null)
              .map(item -> item.reasonType().toString())
              .findFirst()
              .orElse(null));
      return outcome;
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
      return null;
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
   * Integrates catalog presence before remaining reads; shared pages serve admitted scopes inline.
   *
   * @param context admitted passage
   * @param target selected binding
   * @param consume immediate shared-page consumer for already admitted scopes
   * @return reconciled present pool IDs, or null when absence is not established
   */
  private Set<UUID> discover(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      Consumer<DiscoverSeasonSources.PageRead> consume) {
    long ordinal = context.nextReadOrdinal();
    DiscoverSeasonSources.Read read;
    try {
      read = discovery.catalog(target, context::nextReadOrdinal, consume);
    } catch (CollectionBackendFailure failure) {
      throw failure;
    } catch (RuntimeException failure) {
      acquisitionFailed(context, target, ordinal, failure);
      return null;
    }
    record(
        context,
        target,
        ordinal,
        CollectionPhaseEnum.ACQUISITION,
        read.catalog().complete() ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.PARTIAL,
        (long) read.catalog().pools().size(),
        null,
        read.observedAt(),
        null);
    try {
      SportingObservation.CatalogOutcome outcome =
          sporting.catalog(
              target.sourceBindingId(),
              new SportingObservation.Context(
                  context.getCycle().id(), ordinal, read.observedAt(), null),
              read.catalog());
      long accepted = outcome.outcomes().stream().filter(this::accepted).count();
      long rejected = outcome.outcomes().size() - accepted;
      record(
          context,
          target,
          ordinal,
          CollectionPhaseEnum.INTEGRATION,
          measuredOutcome(accepted, rejected),
          accepted,
          rejected,
          clock.instant(),
          null);
      if (!outcome.absenceReconciled()) return null;
      Set<UUID> pools = new LinkedHashSet<>();
      outcome.outcomes().stream()
          .filter(this::accepted)
          .map(SportingObservation.Outcome::resourceId)
          .filter(Objects::nonNull)
          .forEach(pools::add);
      return pools;
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
      return null;
    }
  }

  /**
   * Uses only backend-resolved identities for first details and once-per-team media reads.
   *
   * @param context admitted passage
   * @param target admitted pool
   * @param resource one shared provider page
   * @param ordinal pre-read order
   * @param readTeams passage-local media attempts
   * @param readMatches passage-local detail attempts
   * @param details cumulative independent detail/document evidence
   * @param indexes passage-local auxiliary document indexes
   */
  private void professionalCalendar(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      LnvAcquisition.Resource resource,
      long ordinal,
      Set<UUID> readTeams,
      Set<UUID> readMatches,
      LnvAcquisition.DocumentIndexes indexes,
      DetailEvidence details) {
    LnvAcquisition.Calendar read;
    try {
      read = resource.calendar(target);
    } catch (RuntimeException failure) {
      acquisitionFailed(context, target, ordinal, failure);
      return;
    }
    SportingObservation.CalendarOutcome outcome =
        submitCalendar(context, target, ordinal, read.observation(), read.observedAt());
    if (outcome == null) return;
    Map<String, SportingObservation.Match> matches = new LinkedHashMap<>();
    read.observation().matches().forEach(match -> matches.put(match.nativeMatchReference(), match));
    for (SportingObservation.Outcome item : outcome.outcomes()) {
      if (!accepted(item)) continue;
      SportingObservation.Match match = matches.get(item.sourceReference());
      if (match == null) continue;
      if (Boolean.TRUE.equals(item.created())
          && item.resourceId() != null
          && match.detailUrl() != null
          && readMatches.add(item.resourceId())) {
        detail(
            context,
            target.toBuilder()
                .scopeId(item.resourceId())
                .matchId(item.resourceId())
                .kind(CollectionTargetKindEnum.DETAILS)
                .nativeMatchReference(match.nativeMatchReference())
                .url(match.detailUrl())
                .build(),
            details);
      }
      image(
          context,
          item.homeTeamId(),
          read.logos().get(match.home().nativeTeamReference()),
          readTeams);
      image(
          context,
          item.awayTeamId(),
          read.logos().get(match.away().nativeTeamReference()),
          readTeams);
    }
    informationSheets(context, target, read, outcome, indexes, details);
  }

  /**
   * Sends only qualified auxiliary codes, keeping the original index timestamp on reused bytes.
   *
   * @param context admitted passage
   * @param target admitted calendar owner
   * @param calendar independently acquired sporting identities and dates
   * @param outcome actual F02 identity resolutions
   * @param details cumulative independent detail/document evidence
   * @param indexes bounded passage-local index reads
   */
  private void informationSheets(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      LnvAcquisition.Calendar calendar,
      SportingObservation.CalendarOutcome outcome,
      LnvAcquisition.DocumentIndexes indexes,
      DetailEvidence details) {
    long ordinal = context.nextReadOrdinal();
    LnvAcquisition.DocumentRead read;
    try {
      read = indexes.informationSheets(target, calendar);
    } catch (RuntimeException failure) {
      for (SportingObservation.Outcome item : outcome.outcomes()) {
        if (accepted(item) && item.resourceId() != null)
          details.add(
              item.resourceId(),
              ordinal,
              CollectionPhaseEnum.ACQUISITION,
              CollectionOutcomeEnum.FAILED,
              clock.instant(),
              "Information-sheet index: " + failureReason(failure));
      }
      return;
    }
    if (read == null) return;
    ordinal = read.readOrdinal();
    for (SportingObservation.Outcome item : outcome.outcomes()) {
      SportingObservation.InformationSheet sheet = read.observation().get(item.sourceReference());
      if (!accepted(item) || item.resourceId() == null || sheet == null) continue;
      lifecycle.requireActive();
      details.add(
          item.resourceId(),
          ordinal,
          CollectionPhaseEnum.ACQUISITION,
          CollectionOutcomeEnum.SUCCESS,
          read.observedAt(),
          null);
      try {
        SportingObservation.Outcome association =
            sporting.detail(
                item.resourceId(),
                new SportingObservation.Context(
                    context.getCycle().id(), ordinal, read.observedAt(), null),
                SportingObservation.Facts.builder()
                    .informationSheet(JsonNullable.of(sheet))
                    .build());
        String reason = null;
        if (!accepted(association)) {
          String refusal = association.outcome().toString();
          if (association.reasonType() != null) refusal = association.reasonType().toString();
          reason = "Information-sheet association: " + refusal;
        }
        details.add(
            item.resourceId(),
            ordinal,
            CollectionPhaseEnum.INTEGRATION,
            accepted(association) ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.FAILED,
            clock.instant(),
            reason);
      } catch (CollectionBackendFailure failure) {
        if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) throw failure;
        details.add(
            item.resourceId(),
            ordinal,
            CollectionPhaseEnum.INTEGRATION,
            failed(failure),
            clock.instant(),
            "Information-sheet association: " + failureReason(failure));
      }
    }
  }

  /**
   * Acquires a known match independently from calendar or standings success.
   *
   * @param context admitted passage
   * @param target selected or newly resolved professional match
   * @param evidence cumulative independent detail/document outcomes
   */
  private void detail(
      CollectorLifecycle.AdmittedCycle context,
      CollectionBackend.Target target,
      DetailEvidence evidence) {
    long ordinal = context.nextReadOrdinal();
    LnvAcquisition.Resource resource;
    try {
      resource = lnv.read(target.url());
    } catch (RuntimeException failure) {
      evidence.add(
          target.matchId(),
          ordinal,
          CollectionPhaseEnum.ACQUISITION,
          CollectionOutcomeEnum.FAILED,
          clock.instant(),
          failureReason(failure));
      return;
    }
    for (int part = 0; part < 3; part++) {
      if (part > 0) ordinal = context.nextReadOrdinal();
      LnvAcquisition.Read<SportingObservation.Facts> read;
      try {
        read =
            switch (part) {
              case 0 -> resource.detail(target);
              case 1 -> resource.document(target, "Scoresheet");
              default -> resource.document(target, "DataVolley");
            };
      } catch (RuntimeException failure) {
        evidence.add(
            target.matchId(),
            ordinal,
            CollectionPhaseEnum.ACQUISITION,
            CollectionOutcomeEnum.FAILED,
            clock.instant(),
            failureReason(failure));
        continue;
      }
      if (read == null) continue;
      evidence.add(
          target.matchId(),
          ordinal,
          CollectionPhaseEnum.ACQUISITION,
          read.complete() ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.PARTIAL,
          read.observedAt(),
          read.complete() ? null : "Invalid independent detail fields");
      try {
        SportingObservation.Outcome outcome =
            sporting.detail(
                target.matchId(),
                new SportingObservation.Context(
                    context.getCycle().id(), ordinal, read.observedAt(), null),
                read.observation());
        evidence.add(
            target.matchId(),
            ordinal,
            CollectionPhaseEnum.INTEGRATION,
            accepted(outcome) ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.FAILED,
            clock.instant(),
            outcome.reasonType() == null ? null : outcome.reasonType().toString());
      } catch (CollectionBackendFailure failure) {
        if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) throw failure;
        evidence.add(
            target.matchId(),
            ordinal,
            CollectionPhaseEnum.INTEGRATION,
            failed(failure),
            clock.instant(),
            failureReason(failure));
      }
    }
  }

  /** Passage-local totals prevent a later independent success from hiding a document failure. */
  @RequiredArgsConstructor
  private final class DetailEvidence {
    private final CollectorLifecycle.AdmittedCycle context;
    private final Map<UUID, Map<CollectionPhaseEnum, DetailTotal>> totals = new LinkedHashMap<>();

    /**
     * Reports cumulative measured parts through the existing per-match DETAILS stage.
     *
     * @param match resolved F02 match identity
     * @param ordinal original source-read order
     * @param phase independent acquisition or integration phase
     * @param outcome one actual part's outcome
     * @param observedAt original observation or integration completion time
     * @param reason safe failure diagnostic, retained across later successes
     */
    private void add(
        UUID match,
        long ordinal,
        CollectionPhaseEnum phase,
        CollectionOutcomeEnum outcome,
        Instant observedAt,
        String reason) {
      DetailTotal total =
          totals
              .computeIfAbsent(match, ignored -> new LinkedHashMap<>())
              .computeIfAbsent(phase, ignored -> new DetailTotal());
      if (outcome == CollectionOutcomeEnum.SUCCESS || outcome == CollectionOutcomeEnum.PARTIAL)
        total.obtained++;
      if (outcome != CollectionOutcomeEnum.SUCCESS) {
        total.rejected++;
        total.reason = reason;
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
    private void flush() {
      for (Map.Entry<UUID, Map<CollectionPhaseEnum, DetailTotal>> match : totals.entrySet()) {
        for (Map.Entry<CollectionPhaseEnum, DetailTotal> phase : match.getValue().entrySet()) {
          DetailTotal total = phase.getValue();
          CollectionOutcomeEnum outcome = measuredOutcome(total.obtained, total.rejected);
          if (total.unconfirmed) outcome = CollectionOutcomeEnum.UNCONFIRMED;
          record(
              context,
              match.getKey(),
              CollectionStageEnum.DETAILS,
              total.readOrdinal,
              phase.getKey(),
              outcome,
              total.obtained,
              total.rejected,
              total.observedAt,
              total.reason);
        }
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
    private String reason;
  }

  /**
   * Uploads only a new supplier image read, using its original bounded bytes directly.
   *
   * @param context admitted passage
   * @param team backend-resolved team, absent on rejected identity
   * @param url published native image, absent when unpublished
   * @param attempted passage-local deduplication, including failed attempts
   */
  private void image(
      CollectorLifecycle.AdmittedCycle context, UUID team, URI url, Set<UUID> attempted) {
    if (team == null || url == null || !attempted.add(team)) return;
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
          failureReason(failure));
      return;
    }
    if (read == null) return;
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
    try {
      SportingObservation.Outcome outcome =
          sporting.logo(
              team,
              new SportingObservation.Context(
                  context.getCycle().id(), ordinal, read.observedAt(), null),
              read.observation());
      record(
          context,
          team,
          CollectionStageEnum.LOGO,
          ordinal,
          CollectionPhaseEnum.INTEGRATION,
          accepted(outcome) ? CollectionOutcomeEnum.SUCCESS : CollectionOutcomeEnum.FAILED,
          null,
          null,
          clock.instant(),
          outcome.reasonType() == null ? null : outcome.reasonType().toString());
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) throw failure;
      record(
          context,
          team,
          CollectionStageEnum.LOGO,
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
    if (rejected == 0) return CollectionOutcomeEnum.SUCCESS;
    if (obtained == 0) return CollectionOutcomeEnum.FAILED;
    return CollectionOutcomeEnum.PARTIAL;
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
    record(
        context,
        target.scopeId(),
        CollectionStageEnum.fromValue(target.kind().getValue()),
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
    try {
      backend.record(
          context.getCycle().id(),
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
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) throw failure;
      log.atError()
          .addKeyValue("operation", "collection_result")
          .addKeyValue("cycleId", context.getCycle().id())
          .addKeyValue("scope", scope)
          .addKeyValue("stage", stage)
          .addKeyValue("phase", phase)
          .addKeyValue("outcome", "unconfirmed")
          .log(
              "Current collection evidence could not be confirmed; the operation was not replayed");
    }
  }
}
