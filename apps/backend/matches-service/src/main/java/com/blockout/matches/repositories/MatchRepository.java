package com.blockout.matches.repositories;

import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.enums.MatchStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {

    Optional<Match> findByLeagueCodeAndMatchCode(String leagueCode, String matchCode);

    List<Match> findByPoolId(Long poolId);

    List<Match> findByPoolIdAndActive(Long poolId, Boolean active);

    List<Match> findByActiveTrueAndPoolIdAndMatchCodeIn(Long poolId, Set<String> matchCodes);

    List<Match> findByPoolIdAndMatchCodeInAndActiveTrue(Long poolId, Set<String> matchCodes);

    List<Match> findByIdInAndActiveTrue(Set<Long> matchIds);

    @Query("SELECT m FROM Match m WHERE m.active = :active AND m.poolId = :poolId " +
            "AND (m.teamIdA = :teamId OR m.teamIdB = :teamId)")
    List<Match> findByActiveAndPoolIdAndTeamId(
            @Param("active") Boolean active,
            @Param("poolId") Long poolId,
            @Param("teamId") Long teamId);

    @Query("SELECT m FROM Match m WHERE m.active = :active " +
            "AND (m.teamIdA = :teamId OR m.teamIdB = :teamId)")
    List<Match> findByActiveAndTeamId(
            @Param("active") Boolean active,
            @Param("teamId") Long teamId);

    List<Match> findByStatusAndActiveAndMatchDateLessThanEqual(
            MatchStatus status, boolean active, Instant matchDate);

    Page<Match> findAllByMatchDateLessThanEqual(Instant today, Pageable pageable);

    @Query("SELECT m FROM Match m WHERE m.poolId = :poolId " +
            "AND m.teamIdA = :teamIdA AND m.teamIdB = :teamIdB " +
            "AND DATE(m.matchDate) = :matchDate")
    Optional<Match> findByPoolIdAndTeamIdAAndTeamIdBAndMatchDate(
            @Param("poolId") Long poolId,
            @Param("teamIdA") Long teamIdA,
            @Param("teamIdB") Long teamIdB,
            @Param("matchDate") LocalDate matchDate);

    @Query("""
                SELECT DISTINCT CAST(m.matchDate AS LocalDate)
                FROM Match m
                WHERE m.matchDate <= :today
                    AND m.status = 'FINISHED'
                    AND (
                        (:poolIdsSize > 0 AND m.poolId IN :poolIds)
                        OR (:teamIdsSize > 0 AND (m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds))
                    )
                ORDER BY CAST(m.matchDate AS LocalDate) DESC
            """)
    List<LocalDate> findDistinctDatesUntil(
            @Param("today") Instant today,
            @Param("poolIds") List<Long> poolIds,
            @Param("poolIdsSize") int poolIdsSize,
            @Param("teamIds") List<Long> teamIds,
            @Param("teamIdsSize") int teamIdsSize);

    @Query("""
                SELECT DISTINCT CAST(m.matchDate AS LocalDate)
                FROM Match m
                WHERE m.status = 'UPCOMING'
                    AND CAST(m.matchDate AS LocalDate) >= :today
                    AND (
                        (:poolIdsSize > 0 AND m.poolId IN :poolIds)
                        OR (:teamIdsSize > 0 AND (m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds))
                    )
                ORDER BY CAST(m.matchDate AS LocalDate) ASC
            """)
    List<LocalDate> findDistinctUpcomingDatesIncludingToday(
            @Param("today") LocalDate today,
            @Param("poolIds") List<Long> poolIds,
            @Param("poolIdsSize") int poolIdsSize,
            @Param("teamIds") List<Long> teamIds,
            @Param("teamIdsSize") int teamIdsSize);

    @Query("""
            SELECT m
            FROM Match m
            WHERE m.matchDate >= :startOfDay
                AND m.matchDate < :endOfDay
                AND (
                    (:poolIdsSize > 0 AND m.poolId IN :poolIds)
                    OR (:teamIdsSize > 0 AND (m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds))
                )
                AND (:status IS NULL OR m.status = :status)
                AND (:active IS NULL OR m.active = :active)
            ORDER BY m.poolId ASC, m.matchDate ASC, m.id ASC
            """)
    List<Match> findAllInRangeAsc(
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay,
            @Param("poolIds") List<Long> poolIds,
            @Param("poolIdsSize") int poolIdsSize,
            @Param("status") MatchStatus status,
            @Param("teamIds") List<Long> teamIds,
            @Param("teamIdsSize") int teamIdsSize,
            @Param("active") Boolean active);

    @Query("""
            SELECT m
            FROM Match m
            WHERE m.matchDate >= :startOfDay
                AND m.matchDate < :endOfDay
                AND (
                    (:poolIdsSize > 0 AND m.poolId IN :poolIds)
                    OR (:teamIdsSize > 0 AND (m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds))
                )
                AND (:status IS NULL OR m.status = :status)
                AND (:active IS NULL OR m.active = :active)
            ORDER BY m.poolId ASC, m.matchDate DESC, m.id DESC
            """)
    List<Match> findAllInRangeDesc(
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay,
            @Param("poolIds") List<Long> poolIds,
            @Param("poolIdsSize") int poolIdsSize,
            @Param("status") MatchStatus status,
            @Param("teamIds") List<Long> teamIds,
            @Param("teamIdsSize") int teamIdsSize,
            @Param("active") Boolean active);

    @Query("""
            SELECT m
            FROM Match m
            WHERE (:poolId IS NULL OR m.poolId = :poolId)
                AND (:status IS NULL OR m.status = :status)
                AND (:active IS NULL OR m.active = :active)
                AND (:teamIdsSize = 0 OR m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds)
            ORDER BY m.matchDate DESC, m.id DESC
            """)
    List<Match> findFiltered(
            @Param("poolId") Long poolId,
            @Param("status") MatchStatus status,
            @Param("active") Boolean active,
            @Param("teamIds") List<Long> teamIds,
            @Param("teamIdsSize") int teamIdsSize);

    @Query(
            value = """
                    SELECT m
                    FROM Match m
                    WHERE (:poolId IS NULL OR m.poolId = :poolId)
                        AND (:status IS NULL OR m.status = :status)
                        AND (:active IS NULL OR m.active = :active)
                        AND (:teamIdsSize = 0 OR m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds)
                    ORDER BY m.matchDate DESC, m.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(m)
                    FROM Match m
                    WHERE (:poolId IS NULL OR m.poolId = :poolId)
                        AND (:status IS NULL OR m.status = :status)
                        AND (:active IS NULL OR m.active = :active)
                        AND (:teamIdsSize = 0 OR m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds)
                    """)
    Page<Match> findFilteredPage(
            @Param("poolId") Long poolId,
            @Param("status") MatchStatus status,
            @Param("active") Boolean active,
            @Param("teamIds") List<Long> teamIds,
            @Param("teamIdsSize") int teamIdsSize,
            Pageable pageable);

    @Query("""
        SELECT DISTINCT m
        FROM Match m
        JOIN FETCH m.liveLinks l
        """)
    List<Match> findAllWithLiveLinks();
}
