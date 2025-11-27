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
            LiveLinkStatus status
    );

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
            @Param("end") Instant end
    );

    long countByMatch_IdAndOwnerAuth0IdAndCreatedAtAfter(
            Long matchId,
            String ownerAuth0Id,
            Instant createdAtAfter
    );

    List<MatchLiveLink> findByStatus(LiveLinkStatus status);

    @Query("""
            SELECT l
            FROM MatchLiveLink l
            JOIN FETCH l.match m
            WHERE l.status = :status
        """)
    List<MatchLiveLink> findByStatusWithMatch(@Param("status") LiveLinkStatus status);
}