package com.blockout.backend.contributions.infrastructure;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/**
 * Native ILIKE and SQL aggregates for private moderation; no persistent search/activity counters.
 */
interface ContributionModerationRepository extends Repository<ContributionVersionEntity, UUID> {
  /**
   * @return retained canonical seasons with any contribution, including hidden sporting roots
   */
  @Query(
      value =
          "SELECT DISTINCT p.season_id FROM sporting_pool p JOIN sporting_match m ON m.pool_id=p.id WHERE EXISTS (SELECT 1 FROM contribution_version v WHERE v.match_id=m.id)",
      nativeQuery = true)
  Set<UUID> seasonIds();

  /**
   * Searches literal effective sporting names or addresses on one matching version. PostgreSQL
   * ILIKE and aggregate activity ordering require this scoped native query.
   *
   * @param season optional canonical season
   * @param pattern escaped literal substring pattern
   * @param platform optional persisted provider
   * @param state ALL, TO_REVIEW or exact persisted lifecycle
   * @param page native offset and twenty-item lookahead
   * @return distinct matches ordered by useful activity then UUID
   */
  @Query(
      value =
          """
      SELECT m.id FROM sporting_match m
      JOIN sporting_pool p ON p.id=m.pool_id
      JOIN sporting_team h ON h.id=m.home_team_id
      JOIN sporting_team a ON a.id=m.away_team_id
      LEFT JOIN contribution_state s ON s.match_id=m.id
      WHERE (CAST(:season AS UUID) IS NULL OR p.season_id=:season)
      AND EXISTS (
        SELECT 1 FROM contribution_version v WHERE v.match_id=m.id
        AND (CAST(:platform AS TEXT) IS NULL OR v.platform=:platform)
        AND (:state='ALL' OR v.state=:state OR (:state='TO_REVIEW' AND (
          v.state='PENDING' OR (v.state='HIDDEN' AND v.id=s.report_hold_version_id)
          OR (v.state='ACTIVE' AND EXISTS (SELECT 1 FROM contribution_report r WHERE r.version_id=v.id)))))
        AND (COALESCE(h.manual_name,h.source_name) ILIKE :pattern ESCAPE '!' OR COALESCE(a.manual_name,a.source_name) ILIKE :pattern ESCAPE '!' OR v.address ILIKE :pattern ESCAPE '!')
      )
      ORDER BY (SELECT MAX(GREATEST(v.created_at,v.publication_at,v.decision_at,
        (SELECT MAX(r.reported_at) FROM contribution_report r WHERE r.version_id=v.id)))
        FROM contribution_version v WHERE v.match_id=m.id) DESC, m.id ASC
      """,
      nativeQuery = true)
  Slice<UUID> queue(UUID season, String pattern, String platform, String state, Pageable page);

  /** Counts and activity computed over all versions rather than a downloaded page. */
  interface ActivityRow {
    UUID getMatchId();

    int getActive();

    long getPending();

    int getHidden();

    long getReports();

    long getRejected();

    boolean getHold();

    Instant getLastActivityAt();
  }

  /**
   * Aggregates version lifecycles separately from report counts to avoid join multiplication.
   *
   * @param ids bounded root selection
   * @return current attention and historical totals, with original useful activity
   */
  @Query(
      value =
          """
      SELECT v.match_id AS "matchId",
        CAST(COUNT(*) FILTER (WHERE v.state='ACTIVE') AS INTEGER) AS active,
        COUNT(*) FILTER (WHERE v.state='PENDING') AS pending,
        CAST(COUNT(*) FILTER (WHERE v.id=s.report_hold_version_id) AS INTEGER) AS hidden,
        COALESCE(SUM((SELECT COUNT(*) FROM contribution_report r WHERE r.version_id=v.id)) FILTER (WHERE v.state='ACTIVE' OR v.id=s.report_hold_version_id),0) AS reports,
        COUNT(*) FILTER (WHERE v.state='REJECTED') AS rejected,
        (s.report_hold_version_id IS NOT NULL) AS hold,
        MAX(GREATEST(v.created_at,v.publication_at,v.decision_at,(SELECT MAX(r.reported_at) FROM contribution_report r WHERE r.version_id=v.id))) AS "lastActivityAt"
      FROM contribution_version v LEFT JOIN contribution_state s ON s.match_id=v.match_id
      WHERE v.match_id IN :ids GROUP BY v.match_id,s.report_hold_version_id
      """,
      nativeQuery = true)
  List<ActivityRow> activities(Set<UUID> ids);

  /**
   * Reads native version pages with optional exact or historical selection.
   *
   * @param matchId retained private root
   * @param state optional persisted lifecycle or HISTORICAL
   * @param page native bounded offset
   * @return deterministic version slice
   */
  @Query(
      "SELECT v FROM ContributionVersionEntity v WHERE v.matchId=:matchId AND (:state IS NULL OR CAST(v.state AS STRING)=:state OR (:state='HISTORICAL' AND CAST(v.state AS STRING) NOT IN ('ACTIVE','PENDING'))) ORDER BY v.createdAt DESC,v.id ASC")
  Slice<ContributionVersionEntity> versions(UUID matchId, String state, Pageable page);

  /** Exact all-row report totals, including anonymized rows. */
  interface ReportCount {
    UUID getId();

    long getCount();
  }

  /**
   * Counts reports without selecting their authors or reasons.
   *
   * @param ids bounded exact versions
   * @return nonzero report totals
   */
  @Query(
      "SELECT r.versionId AS id, COUNT(r) AS count FROM ContributionReportEntity r WHERE r.versionId IN :ids GROUP BY r.versionId")
  List<ReportCount> reportCounts(Set<UUID> ids);

  /**
   * Selects only safe private report fields, without reporter identity.
   *
   * @param versionId exact authorized version
   * @param page native twenty-item page
   * @return time-descending then UUID-ascending report facts
   */
  @Query(
      "SELECT NEW com.blockout.backend.contributions.application.ModerationStore$Report(r.id,r.reportedAt,r.reason) FROM ContributionReportEntity r WHERE r.versionId=:versionId ORDER BY r.reportedAt DESC,r.id ASC")
  Slice<com.blockout.backend.contributions.application.ModerationStore.Report> reports(
      UUID versionId, Pageable page);
}
