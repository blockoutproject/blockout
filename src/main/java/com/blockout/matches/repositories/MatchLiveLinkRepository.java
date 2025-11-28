package com.blockout.matches.repositories;

import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MatchLiveLinkRepository extends JpaRepository<MatchLiveLink, Long> {

    Optional<MatchLiveLink> findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(
            Long matchId,
            LiveLinkStatus status);

    List<MatchLiveLink> findByMatch_Id(Long matchId);

    long countByMatch_IdAndOwnerAuth0Id(Long matchId, String ownerAuth0Id);

    @Query("""
                SELECT COUNT(DISTINCT l.match.id)
                FROM MatchLiveLink l
                WHERE l.ownerAuth0Id = :ownerAuth0Id
                AND l.createdAt BETWEEN :start AND :end
            """)
    long countDistinctMatchesByOwnerAndDay(
            @Param("ownerAuth0Id") String ownerAuth0Id,
            @Param("start") Instant start,
            @Param("end") Instant end);

    long countByMatch_IdAndOwnerAuth0IdAndCreatedAtAfter(
            Long matchId,
            String ownerAuth0Id,
            Instant createdAtAfter);

    List<MatchLiveLink> findByStatus(LiveLinkStatus status);

    List<MatchLiveLink> findByMatch_IdAndOwnerAuth0IdAndStatus(
            Long matchId,
            String ownerAuth0Id,
            LiveLinkStatus status);

    Optional<MatchLiveLink> findFirstByMatch_IdAndOwnerAuth0IdOrderByCreatedAtDesc(
            Long matchId,
            String ownerAuth0Id);

    Optional<MatchLiveLink> findFirstByMatch_IdOrderByCreatedAtDesc(Long matchId);

    @Query("""
                SELECT l
                FROM MatchLiveLink l
                JOIN FETCH l.match m
            """)
    List<MatchLiveLink> findAllWithMatch();

    @Query("""
            SELECT l
            FROM MatchLiveLink l
            WHERE l.match.id IN :matchIds
                AND l.status = :status
            """)
    List<MatchLiveLink> findByMatchIdInAndStatus(
            @Param("matchIds") List<Long> matchIds,
            @Param("status") LiveLinkStatus status);
}