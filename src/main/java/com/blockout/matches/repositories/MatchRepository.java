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
      AND (:poolIdsSize = 0 OR m.poolId IN :poolIds)
      AND (:teamIdsSize = 0 OR m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds)
    ORDER BY CAST(m.matchDate AS LocalDate) DESC
  """)
  List<LocalDate> findDistinctDatesUntil(
      @Param("today") LocalDateTime today,
      @Param("poolIds") List<Long> poolIds,
      @Param("poolIdsSize") int poolIdsSize,
      @Param("teamIds") List<Long> teamIds,
      @Param("teamIdsSize") int teamIdsSize
  );

  @Query("""
    SELECT m
    FROM Match m
    WHERE m.matchDate >= :startOfDay
      AND m.matchDate < :endOfDay
      AND (:poolIdsSize = 0 OR m.poolId IN :poolIds)
      AND (:teamIdsSize = 0 OR m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds)
      AND (:status IS NULL OR m.status = :status)
    ORDER BY m.poolId ASC, m.matchDate ASC
  """)
  List<Match> findAllInRange(
      @Param("startOfDay") LocalDateTime startOfDay,
      @Param("endOfDay") LocalDateTime endOfDay,
      @Param("poolIds") List<Long> poolIds,
      @Param("poolIdsSize") int poolIdsSize,
      @Param("status") MatchStatus status,
      @Param("teamIds") List<Long> teamIds,
      @Param("teamIdsSize") int teamIdsSize
  );

  @Query("""
    SELECT DISTINCT CAST(m.matchDate AS LocalDate)
    FROM Match m
    WHERE m.status = 'UPCOMING'
      AND (:poolIdsSize = 0 OR m.poolId IN :poolIds)
      AND (:teamIdsSize = 0 OR m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds)
    ORDER BY CAST(m.matchDate AS LocalDate) ASC
  """)
  List<LocalDate> findDistinctUpcomingDates(
      @Param("poolIds") List<Long> poolIds,
      @Param("poolIdsSize") int poolIdsSize,
      @Param("teamIds") List<Long> teamIds,
      @Param("teamIdsSize") int teamIdsSize
  );
}