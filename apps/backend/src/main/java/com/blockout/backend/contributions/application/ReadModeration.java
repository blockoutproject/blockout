package com.blockout.backend.contributions.application;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.contributions.application.ModerationStore.Activity;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.generated.mobile.model.StreamModerationFilterEnum;
import com.blockout.backend.generated.mobile.model.StreamPlatformEnum;
import com.blockout.backend.generated.mobile.model.StreamVersionFilterEnum;
import com.blockout.backend.sporting.application.ReadPrivateMatches;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Current private grant-protected views composed in short repeatable-read transactions. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReadModeration {
  private final ModerationStore reads;
  private final ContributionStore versions;
  private final AccountAccess accounts;
  private final CurrentPermissions permissions;
  private final ReadPrivateMatches contexts;
  private final ReadSportingData sporting;
  private final MatchContributionAccess eligibility;

  /**
   * Reads a native page of distinct roots with exact SQL badges and bounded sporting hydration.
   *
   * @param actor current admitted original moderator
   * @param season optional known season
   * @param query optional literal fragment; blank removes only text filtering
   * @param platform optional canonical provider
   * @param state optional selection, defaulting to to-review
   * @param page zero-based page with supported native offset
   * @return coherent queue; failures never become empty success
   */
  public Queue queue(
      UUID actor,
      UUID season,
      String query,
      StreamPlatformEnum platform,
      StreamModerationFilterEnum state,
      long page) {
    require(actor);
    int index = page(page);
    if (season != null && sporting.season(season).isEmpty())
      throw new SportingResourceNotFoundException();
    ModerationStore.QueuePage selected =
        reads.queue(
            season,
            query == null ? "" : query,
            platform == null ? null : platform.name(),
            state == null ? "TO_REVIEW" : state.name(),
            index);
    Set<UUID> ids = Set.copyOf(selected.ids());
    Map<UUID, Activity> activity = reads.activities(ids);
    Map<UUID, ReadPrivateMatches.Context> matches = contexts.read(ids);
    return new Queue(
        selected.ids().stream().map(id -> new Item(matches.get(id), activity.get(id))).toList(),
        next(page, selected.hasNext()),
        contexts.seasons(reads.seasonIds()));
  }

  /**
   * Reads context, independent active link and a filtered version page without publishing anything.
   *
   * @param actor current original moderator
   * @param matchId retained private root
   * @param state optional version selection
   * @param page zero-based bounded page
   * @return internally coherent private detail with exact current publication capability
   */
  public Match read(UUID actor, UUID matchId, StreamVersionFilterEnum state, long page) {
    require(actor);
    int index = page(page);
    ReadPrivateMatches.Context context = contexts.read(Set.of(matchId)).get(matchId);
    if (context == null) throw new SportingResourceNotFoundException();
    boolean canPublish = context.publiclyViewable() && !eligibility.read(matchId).professional();
    ContributionStore.VersionPage found =
        reads.versions(matchId, state == null ? null : state.name(), index);
    ContributionVersion active = versions.active(matchId).orElse(null);
    List<ContributionVersion> selected = new ArrayList<>(found.items());
    if (active != null) selected.add(active);
    Map<UUID, Version> enriched = enrich(selected, canPublish);
    return new Match(
        Long.toString(versions.state(matchId).revision()),
        context,
        reads
            .activities(Set.of(matchId))
            .getOrDefault(
                matchId,
                new Activity(matchId, new ModerationStore.Counts(0, 0, 0, 0, 0), false, null)),
        canPublish,
        active == null ? null : enriched.get(active.id()),
        found.items().stream().map(v -> enriched.get(v.id())).toList(),
        next(page, found.hasNext()));
  }

  /**
   * Reads the exact member under current grant without transferring its identity to a replacement.
   *
   * @param actor current moderator
   * @param matchId private retained match
   * @param versionId exact member
   * @return current member and match editing revision
   */
  public Detail member(UUID actor, UUID matchId, UUID versionId) {
    require(actor);
    ContributionVersion version = version(matchId, versionId);
    MatchContributionAccess.Facts facts = eligibility.read(matchId);
    return new Detail(
        Long.toString(versions.state(matchId).revision()),
        enrich(List.of(version), facts.viewable() && !facts.professional()).get(versionId));
  }

  /**
   * Enriches an accepted command without replacing its acknowledged revision/state with a later
   * read.
   *
   * @param actor original admitted moderator
   * @param outcome accepted command facts, never reconstructed from current history
   * @return acknowledged member with currently permitted attribution and action capabilities
   */
  public Detail result(UUID actor, SubmitContribution.Outcome outcome) {
    require(actor);
    MatchContributionAccess.Facts facts = eligibility.read(outcome.version().matchId());
    return new Detail(
        outcome.revision(),
        enrich(List.of(outcome.version()), facts.viewable() && !facts.professional())
            .get(outcome.version().id()));
  }

  /**
   * Reads report dates and nullable reasons while never selecting reporter identity.
   *
   * @param actor current moderator
   * @param matchId retained match
   * @param versionId exact historical or current version
   * @param page bounded zero-based page
   * @return reports and their all-row SQL total
   */
  public Reports reports(UUID actor, UUID matchId, UUID versionId, long page) {
    require(actor);
    version(matchId, versionId);
    ModerationStore.ReportPage found = reads.reports(versionId, page(page));
    return new Reports(found.count(), found.items(), next(page, found.hasNext()));
  }

  /**
   * Checks current complete rights inside the same snapshot as every private response.
   *
   * @param actor original admitted account, which must still exist and hold the full grant
   * @throws AccountNotFoundException when the original account no longer exists
   * @throws AccessDeniedException when its current moderation grant is absent
   */
  private void require(UUID actor) {
    if (!accounts.exists(actor)) throw new AccountNotFoundException();
    if (!permissions.forAccount(actor).contains(Permission.MODERATE_STREAM_LINKS))
      throw new AccessDeniedException("Action is not permitted");
  }

  /**
   * Resolves an exact member of the authorized retained root, or deliberately returns absence.
   *
   * @param matchId authorized private sporting root
   * @param versionId exact retained member
   * @return current detached version
   * @throws SportingResourceNotFoundException when the target does not belong to the root
   */
  private ContributionVersion version(UUID matchId, UUID versionId) {
    return versions
        .version(versionId)
        .filter(v -> v.matchId().equals(matchId))
        .orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Batch-enriches a bounded page; current names and all report totals never cause N+1 queries.
   *
   * @param selected page members and optional independently selected active version
   * @param canPublish current sporting eligibility for publication actions
   * @return presentations indexed by distinct version identity, omitting erased actor names
   */
  private Map<UUID, Version> enrich(List<ContributionVersion> selected, boolean canPublish) {
    Set<UUID> actors =
        selected.stream()
            .flatMap(version -> version.attributionAccounts().stream())
            .collect(Collectors.toSet());
    Map<UUID, String> names = accounts.displayNames(actors);
    Map<UUID, Long> counts =
        reads.reportCounts(
            selected.stream().map(ContributionVersion::id).collect(Collectors.toSet()));
    return selected.stream()
        .distinct()
        .collect(
            Collectors.toUnmodifiableMap(
                ContributionVersion::id,
                v ->
                    new Version(
                        v,
                        v.ownerId() == null ? null : names.get(v.ownerId()),
                        v.publication() == null || v.publication().actorId() == null
                            ? null
                            : names.get(v.publication().actorId()),
                        v.decision() == null || v.decision().actorId() == null
                            ? null
                            : names.get(v.decision().actorId()),
                        counts.getOrDefault(v.id(), 0L),
                        canPublish)));
  }

  /**
   * Rejects unsupported offsets before reaching native pagination.
   *
   * @param page requested zero-based page
   * @return supported native page index
   * @throws IllegalArgumentException when its twenty-item offset cannot be represented
   */
  private int page(long page) {
    if (page < 0 || page > 107374182) throw new IllegalArgumentException("Invalid page");
    return (int) page;
  }

  /**
   * Refuses an unrepresentable continuation instead of silently claiming exhaustion.
   *
   * @param page current supported page
   * @param hasNext native slice continuation fact
   * @return next supported index, or null only when the slice is exhausted
   * @throws IllegalArgumentException when the next offset cannot be represented
   */
  private Long next(long page, boolean hasNext) {
    if (!hasNext) return null;
    page(page + 1);
    return page + 1;
  }

  /** Bounded queue plus ordinary continuation. */
  public record Queue(
      List<Item> items,
      Long nextPage,
      List<com.blockout.backend.sporting.application.model.SportingViews.SeasonView> seasons) {}

  /** Current sporting context and SQL badges/activity for one distinct root. */
  public record Item(ReadPrivateMatches.Context match, Activity activity) {}

  /** Private page with current active member independently of filtering and paging. */
  public record Match(
      String revision,
      ReadPrivateMatches.Context match,
      Activity activity,
      boolean canPublish,
      Version activeContribution,
      List<Version> items,
      Long nextPage) {}

  /**
   * Bounded current version presentation with nullable original attribution and all report facts.
   */
  public record Version(
      ContributionVersion version,
      String authorName,
      String publicationActorName,
      String decisionActorName,
      long reportCount,
      boolean canPublish) {}

  /** Exact version and current revision. */
  public record Detail(String revision, Version contribution) {}

  /** Safe exact-version report page and independent SQL total. */
  public record Reports(long count, List<ModerationStore.Report> items, Long nextPage) {}
}
