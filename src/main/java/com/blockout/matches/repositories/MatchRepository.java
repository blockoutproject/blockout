package com.blockout.matches.repositories;

import com.blockout.matches.models.Match;
import com.blockout.matches.models.MatchStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {
  Optional<Match> findByLeagueCodeAndMatchCode(String leagueCode, String matchCode);

  List<Match> findByPoolIdAndActive(Long poolId, Boolean active);

  List<Match> findByStatusAndActiveAndMatchDateLessThanEqual(MatchStatus status, boolean active,
      LocalDateTime matchDate);

  @Query("SELECT m FROM Match m WHERE m.poolId = :poolId AND m.teamIdA = :teamIdA AND m.teamIdB = :teamIdB AND DATE(m.matchDate) = :matchDate")
  Optional<Match> findByPoolIdAndTeamIdAAndTeamIdBAndMatchDate(
      @Param("poolId") Long poolId,
      @Param("teamIdA") Long teamIdA,
      @Param("teamIdB") Long teamIdB,
      @Param("matchDate") LocalDate matchDate);

  List<Match> findByTeamIdAOrTeamIdB(Long teamIdA, Long teamIdB);

  List<Match> findByPoolId(Long poolId);

  Page<Match> findAllByMatchDateLessThanEqual(LocalDateTime today, Pageable pageable);

  @Query("""
          SELECT DISTINCT CAST(m.matchDate AS LocalDate)
          FROM Match m
          WHERE m.matchDate <= :today
            AND m.status = 'FINISHED'
            AND (
              (:poolId IS NULL AND m.poolId IN :allowedPools)
              OR (:poolId IS NOT NULL AND m.poolId = :poolId)
            )
            AND (
              :teamId IS NULL
              OR m.teamIdA = :teamId
              OR m.teamIdB = :teamId
            )
          ORDER BY CAST(m.matchDate AS LocalDate) DESC
        """)
  List<LocalDate> findDistinctDatesUntil(
    @Param("today") LocalDateTime today,
    @Param("poolId") Long poolId,
    @Param("teamId") Long teamId,
    @Param("allowedPools") List<Long> allowedPools
  );

  @Query("""
          SELECT m
          FROM Match m
          WHERE m.matchDate >= :startOfDay
            AND m.matchDate < :endOfDay
            AND (
              (:poolId IS NULL AND m.poolId IN :allowedPools)
              OR (:poolId IS NOT NULL AND m.poolId = :poolId)
            )
            AND (
              :teamId IS NULL
              OR m.teamIdA = :teamId
              OR m.teamIdB = :teamId
            )
            AND (:status IS NULL OR m.status = :status)
          ORDER BY m.poolId ASC, m.matchDate ASC
        """)
  List<Match> findAllInRange(
    @Param("startOfDay") LocalDateTime startOfDay,
    @Param("endOfDay") LocalDateTime endOfDay,
    @Param("poolId") Long poolId,
    @Param("status") MatchStatus status,
    @Param("teamId") Long teamId,
    @Param("allowedPools") List<Long> allowedPools
  );

  @Query("""
          SELECT DISTINCT CAST(m.matchDate AS LocalDate)
          FROM Match m
          WHERE m.status = 'UPCOMING'
            AND (
              (:poolId IS NULL AND m.poolId IN :allowedPools)
              OR (:poolId IS NOT NULL AND m.poolId = :poolId)
            )
            AND (
              :teamId IS NULL
              OR m.teamIdA = :teamId
              OR m.teamIdB = :teamId
            )
          ORDER BY CAST(m.matchDate AS LocalDate) ASC
        """)
  List<LocalDate> findDistinctUpcomingDates(
    @Param("poolId") Long poolId,
    @Param("teamId") Long teamId,
    @Param("allowedPools") List<Long> allowedPools
  );
}