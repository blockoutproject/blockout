package com.blockout.backend.contributions.application;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Private SQL selections and aggregate facts; application reads own current grant authorization.
 */
public interface ModerationStore {
  /**
   * @return distinct retained seasons containing contributions, independently of queue filters
   */
  Set<UUID> seasonIds();

  /**
   * Finds distinct matching roots using literal, combined version criteria and native pages.
   *
   * @param season optional canonical season
   * @param query literal fragment, blank for no text filter
   * @param platform optional persisted provider value
   * @param state ALL, TO_REVIEW or one persisted lifecycle
   * @param page bounded zero-based twenty-item page
   * @return selected roots and lookahead, without a cross-request snapshot promise
   */
  QueuePage queue(UUID season, String query, String platform, String state, int page);

  /**
   * Reads SQL badges independently of loaded versions/reports.
   *
   * @param ids bounded existing match selection
   * @return current counts and latest useful activity per root
   */
  Map<UUID, Activity> activities(Set<UUID> ids);

  /**
   * Reads a bounded deterministic version page.
   *
   * @param matchId authorized private root
   * @param state optional lifecycle or HISTORICAL
   * @param page bounded zero-based page
   * @return creation descending and UUID ascending versions
   */
  ContributionStore.VersionPage versions(UUID matchId, String state, int page);

  /**
   * Counts every retained report for each selected exact version.
   *
   * @param ids bounded version selection
   * @return SQL counts, omitting zero rows
   */
  Map<UUID, Long> reportCounts(Set<UUID> ids);

  /**
   * Reads report facts without selecting reporter identities.
   *
   * @param versionId authorized exact member
   * @param page bounded zero-based page
   * @return original times and nullable reasons, ordered by time descending then UUID
   */
  ReportPage reports(UUID versionId, int page);

  /** Current badges distinguish active attention and historical rejection. */
  record Counts(int active, long pending, int hidden, long reports, long rejected) {}

  /** SQL-derived useful activity; erasure and reads create no activity. */
  record Activity(UUID matchId, Counts counts, boolean hold, Instant lastActivityAt) {}

  /** Distinct root page with native lookahead. */
  record QueuePage(List<UUID> ids, boolean hasNext) {}

  /** A counted report deliberately contains no reporter identity. */
  record Report(UUID id, Instant reportedAt, String reason) {}

  /** Exact report total is independent of this bounded page. */
  record ReportPage(long count, List<Report> items, boolean hasNext) {}
}
