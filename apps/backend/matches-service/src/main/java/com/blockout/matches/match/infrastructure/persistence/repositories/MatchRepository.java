package com.blockout.matches.match.infrastructure.persistence.repositories;

import com.blockout.matches.match.application.models.MatchStatus;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public interface MatchRepository extends JpaRepository<MatchEntity, Long> {

    List<MatchEntity> findByActiveTrueAndPoolIdAndMatchCodeIn(Long poolId, Set<String> matchCodes);

    @Query("""
        SELECT DISTINCT CAST(m.matchDate AS LocalDate)
        FROM MatchEntity m
        WHERE m.matchDate <= :today
            AND m.status = 'FINISHED'
            AND ((:poolIdsSize > 0 AND m.poolId IN :poolIds)
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
        FROM MatchEntity m
        WHERE m.status = 'UPCOMING'
            AND CAST(m.matchDate AS LocalDate) >= :today
            AND ((:poolIdsSize > 0 AND m.poolId IN :poolIds)
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
        SELECT m FROM MatchEntity m
        WHERE m.matchDate >= :startOfDay AND m.matchDate < :endOfDay
            AND ((:poolIdsSize > 0 AND m.poolId IN :poolIds)
                OR (:teamIdsSize > 0 AND (m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds))
            )
            AND (:status IS NULL OR m.status = :status)
            AND (:active IS NULL OR m.active = :active)
        ORDER BY m.poolId ASC, m.matchDate ASC
        """)
    List<MatchEntity> findAllInRangeAsc(
        @Param("startOfDay") Instant startOfDay,
        @Param("endOfDay") Instant endOfDay,
        @Param("poolIds") List<Long> poolIds,
        @Param("poolIdsSize") int poolIdsSize,
        @Param("status") MatchStatus status,
        @Param("teamIds") List<Long> teamIds,
        @Param("teamIdsSize") int teamIdsSize,
        @Param("active") Boolean active);

    @Query("""
        SELECT m FROM MatchEntity m
        WHERE m.matchDate >= :startOfDay AND m.matchDate < :endOfDay
            AND ((:poolIdsSize > 0 AND m.poolId IN :poolIds)
                OR (:teamIdsSize > 0 AND (m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds))
            )
            AND (:status IS NULL OR m.status = :status)
            AND (:active IS NULL OR m.active = :active)
        ORDER BY m.poolId ASC, m.matchDate DESC
        """)
    List<MatchEntity> findAllInRangeDesc(
        @Param("startOfDay") Instant startOfDay,
        @Param("endOfDay") Instant endOfDay,
        @Param("poolIds") List<Long> poolIds,
        @Param("poolIdsSize") int poolIdsSize,
        @Param("status") MatchStatus status,
        @Param("teamIds") List<Long> teamIds,
        @Param("teamIdsSize") int teamIdsSize,
        @Param("active") Boolean active);

    @Query("""
        SELECT m FROM MatchEntity m
        WHERE (:poolId IS NULL OR m.poolId = :poolId)
            AND (:status IS NULL OR m.status = :status)
            AND (:active IS NULL OR m.active = :active)
            AND (:teamIdsSize = 0 OR m.teamIdA IN :teamIds OR m.teamIdB IN :teamIds)
        ORDER BY m.matchDate DESC
        """)
    List<MatchEntity> findFiltered(
        @Param("poolId") Long poolId,
        @Param("status") MatchStatus status,
        @Param("active") Boolean active,
        @Param("teamIds") List<Long> teamIds,
        @Param("teamIdsSize") int teamIdsSize);

    @Query("SELECT DISTINCT m FROM MatchEntity m JOIN FETCH m.liveLinks")
    List<MatchEntity> findAllWithLiveLinks();
}
