package com.blockout.backend.collection.infrastructure.persistence;

import static com.blockout.backend.shared.persistence.PostgresSearchText.FOLD_PREFIX;
import static com.blockout.backend.shared.persistence.PostgresSearchText.FOLD_SUFFIX;
import static com.blockout.backend.shared.persistence.PostgresSearchText.QUERY_TERMS_CTE;

import com.blockout.backend.collection.application.model.CollectionAttempt;
import com.blockout.backend.collection.application.model.CollectionState.ResultSummary;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Current result reads for collector decisions and operator evidence. */
interface CollectionResultRepository
    extends JpaRepository<CollectionResultEntity, CollectionResultEntity.Key> {
  /**
   * Reads actual acquisition evidence independently from integration outcomes.
   *
   * @param controlId independent family
   * @param scopeIds bounded batch of candidate identities
   * @return current actual acquisition attempts, outcomes, logical tokens and usable observations
   */
  @Query(
      "SELECT NEW com.blockout.backend.collection.application.model.CollectionAttempt(r.scopeId, r.stage, r.lastAttemptAt, r.lastSuccessAt, r.outcome, r.cycleOrder, r.readOrdinal) FROM CollectionResultEntity r WHERE r.controlId = :controlId AND r.scopeId IN :scopeIds AND r.phase = com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum.ACQUISITION")
  List<CollectionAttempt> attempts(UUID controlId, List<UUID> scopeIds);

  @Query(
      """
      SELECT r FROM CollectionResultEntity r
      WHERE r.controlId IN (SELECT c.id FROM CollectionControlEntity c WHERE c.seasonId = :seasonId)
        AND r.scopeId IN :sourceIds
        AND r.stage = com.blockout.backend.generated.ingestion.model.CollectionStageEnum.DISCOVERY
      """)
  List<CollectionResultEntity> catalogResults(UUID seasonId, List<UUID> sourceIds);

  /**
   * Searches displayable labels and localized stage/phase, using PostgreSQL text normalization and
   * term matching. Joins resolve only stable, in-scope identities because superseded cycle
   * snapshots are discarded while their latest results are retained. Competition catalogue
   * attribution follows the supported family-to-provider mapping. Seasonless evidence uses the
   * independently controlled club scope.
   *
   * @param controlId independent owner
   * @param query optional literal search text
   * @param outcome optional exact persisted outcome
   * @param sourceId optional authorized source binding
   * @param stage optional exact persisted stage
   * @param page bounded native page
   * @return latest evidence with stable ties and any known catalogue attribution
   */
  @Query(
      value =
          QUERY_TERMS_CTE
              + """
          , attributed AS (
            SELECT r.scope_id AS "scopeId", r.stage, r.phase, r.cycle_order AS "cycleOrder",
              r.read_ordinal AS "readOrdinal", r.last_attempt_at AS "observedAt",
              r.outcome, r.last_success_at AS "lastSuccessAt", r.reason_type AS "reasonType",
              r.reason, r.obtained_count AS "obtainedCount", r.rejected_count AS "rejectedCount",
              NULLIF(CASE
                WHEN r.stage = 'DETAILS' THEN CONCAT_WS(' - ', COALESCE(home.manual_name, home.source_name),
                  COALESCE(away.manual_name, away.source_name))
                WHEN r.stage = 'LOGO' THEN COALESCE(team.manual_name, team.source_name)
                WHEN r.stage IN ('CLUB_SHEET', 'GEOCODING') THEN COALESCE(club.manual_name, club.source_name)
                ELSE COALESCE(p.manual_name, p.source_name)
              END, '') AS "scopeLabel",
              s.id AS "sourceId", s.provider AS "sourceProvider",
              s.organizer_reference AS "organizerReference",
              s.display_name AS "sourceDisplayName",
              CASE WHEN s.provider = 'FFVB' THEN p.pack_id END AS "packId",
              CASE WHEN s.provider = 'FFVB' THEN p.id END AS "poolId",
              CASE WHEN s.provider = 'LNV' THEN p.reference END AS "phaseReference"
            FROM collection_result r JOIN collection_control c ON c.id = r.control_id
            CROSS JOIN LATERAL (
              SELECT CASE c.family WHEN 'FFVB' THEN 'FFVB' WHEN 'LNV' THEN 'LNV' END AS provider
            ) competition
            LEFT JOIN sporting_match m ON r.stage = 'DETAILS' AND m.id = r.scope_id
            LEFT JOIN sporting_pool p ON
              p.id = CASE WHEN r.stage = 'DETAILS' THEN m.pool_id
                WHEN r.stage IN ('CALENDAR', 'STANDINGS') THEN r.scope_id END
              AND p.season_id = c.season_id AND p.provider = competition.provider
            LEFT JOIN sporting_team home ON p.id IS NOT NULL AND home.id = m.home_team_id
              AND home.season_id = c.season_id AND home.provider = competition.provider
            LEFT JOIN sporting_team away ON p.id IS NOT NULL AND away.id = m.away_team_id
              AND away.season_id = c.season_id AND away.provider = competition.provider
            LEFT JOIN sporting_team team ON r.stage = 'LOGO' AND team.id = r.scope_id
              AND team.season_id = c.season_id AND team.provider = competition.provider
            LEFT JOIN sporting_club club ON c.season_id IS NULL AND club.provider = 'FFVB'
              AND club.id = r.scope_id AND (
                (r.stage = 'CLUB_SHEET' AND c.family = 'CLUB_SHEETS') OR
                (r.stage = 'GEOCODING' AND c.family = 'GEOCODING'))
            LEFT JOIN collection_source_binding s ON s.season_id = c.season_id
              AND s.provider = competition.provider AND (
                (r.stage = 'DISCOVERY' AND s.id = r.scope_id) OR
                s.organizer_reference = COALESCE(p.organizer_reference,
                  CASE WHEN team.provider = 'LNV' THEN team.organizer_reference END))
            WHERE r.control_id = :controlId
              AND (CAST(:outcome AS TEXT) IS NULL OR r.outcome = :outcome)
              AND (CAST(:stage AS TEXT) IS NULL OR r.stage = :stage)
              AND (CAST(:sourceId AS UUID) IS NULL OR s.id = :sourceId)
          )
          SELECT *
          FROM attributed
          WHERE NOT EXISTS (
            SELECT 1 FROM terms
            WHERE POSITION(terms.value IN
          """
              + FOLD_PREFIX
              + """
              CONCAT_WS(' ', "scopeLabel", "sourceDisplayName", "sourceProvider", "organizerReference",
                CASE stage
                  WHEN 'DISCOVERY' THEN 'Découverte'
                  WHEN 'CALENDAR' THEN 'Calendrier'
                  WHEN 'DETAILS' THEN 'Détails'
                  WHEN 'STANDINGS' THEN 'Classement'
                  WHEN 'CLUB_SHEET' THEN 'Fiche club'
                  WHEN 'GEOCODING' THEN 'Géocodage'
                  WHEN 'LOGO' THEN 'Logo'
                END,
                CASE phase
                  WHEN 'ACQUISITION' THEN 'Acquisition'
                  WHEN 'INTEGRATION' THEN 'Intégration'
                END
              )
          """
              + FOLD_SUFFIX
              + """
            ) = 0
          )
          ORDER BY "observedAt" DESC NULLS LAST, "scopeId", stage, phase
          """,
      nativeQuery = true)
  Slice<CurrentResult> currentResults(
      UUID controlId, String query, String outcome, UUID sourceId, String stage, Pageable page);

  /** Counts every current outcome for an existing control, including an empty one. */
  @Query(
      """
      SELECT NEW com.blockout.backend.collection.application.model.CollectionState$ResultSummary(
        COUNT(*) FILTER (WHERE r.outcome = CollectionOutcomeEnum.SUCCESS),
        COUNT(*) FILTER (WHERE r.outcome = CollectionOutcomeEnum.PARTIAL),
        COUNT(*) FILTER (WHERE r.outcome = CollectionOutcomeEnum.FAILED),
        COUNT(*) FILTER (WHERE r.outcome = CollectionOutcomeEnum.UNCONFIRMED))
      FROM CollectionControlEntity c LEFT JOIN CollectionResultEntity r ON r.controlId = c.id
      WHERE c.id = :controlId GROUP BY c.id
      """)
  Optional<ResultSummary> summary(UUID controlId);

  /** Scalar result and scoped labels from the same bounded query. */
  interface CurrentResult {
    UUID getScopeId();

    String getStage();

    String getPhase();

    long getCycleOrder();

    long getReadOrdinal();

    Instant getObservedAt();

    String getOutcome();

    Instant getLastSuccessAt();

    String getReasonType();

    String getReason();

    Long getObtainedCount();

    Long getRejectedCount();

    String getScopeLabel();

    UUID getSourceId();

    String getSourceProvider();

    String getOrganizerReference();

    String getSourceDisplayName();

    UUID getPackId();

    UUID getPoolId();

    String getPhaseReference();
  }

  /**
   * Qualifies success from both phases of every selected target and any additional child results.
   * The known control keeps evidence lookups within the leading key of the current-result index.
   * Each role has two phases. Conditional standings may also have zero recorded phases.
   *
   * @param controlId immutable owner of the retained cycle
   * @param cycleId frozen nonempty selection
   * @param cycleOrder current logical passage
   * @return true only when no selected role is missing and no current result failed
   */
  @Query(
      """
      SELECT CASE WHEN COUNT(c) > 0 THEN TRUE ELSE FALSE END
      FROM CollectionCycleEntity c
      WHERE c.id = :cycleId AND c.controlId = :controlId
        AND EXISTS (SELECT 1 FROM CollectionTargetEntity t WHERE t.cycleId = c.id)
        AND NOT EXISTS (SELECT 1 FROM CollectionResultEntity r
          WHERE r.controlId = :controlId AND r.cycleOrder = :cycleOrder
            AND r.outcome <> CollectionOutcomeEnum.SUCCESS)
        AND NOT EXISTS (
          SELECT t.scopeId FROM CollectionTargetEntity t
          LEFT JOIN CollectionResultEntity r ON r.controlId = :controlId AND r.cycleOrder = :cycleOrder
            AND r.scopeId = t.scopeId AND (r.stage = t.kind
              OR (t.kind = 'STANDINGS_AFTER_FINAL_SCORE' AND r.stage = CollectionStageEnum.STANDINGS))
          WHERE t.cycleId = c.id
          GROUP BY t.scopeId, t.kind
          HAVING COUNT(r.scopeId) = 1
            OR (COUNT(r.scopeId) = 0 AND t.kind <> 'STANDINGS_AFTER_FINAL_SCORE'))
      """)
  boolean successful(UUID controlId, UUID cycleId, long cycleOrder);
}
