package com.blockout.matches.repositories;

import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MatchLiveLinkRepository extends JpaRepository<MatchLiveLink, Long> {

    Optional<MatchLiveLink> findFirstByMatchIdAndStatusOrderByCreatedAtDesc(
            Long matchId,
            LiveLinkStatus status);

    List<MatchLiveLink> findByMatchId(Long matchId);

    long countByMatchIdAndOwnerAuth0Id(Long matchId, String ownerAuth0Id);

    @Query("""
                SELECT COUNT(DISTINCT l.matchId)
                FROM MatchLiveLink l
                WHERE l.ownerAuth0Id = :ownerAuth0Id
                AND l.createdAt BETWEEN :start AND :end
            """)
    long countDistinctMatchesByOwnerAndDay(
            @Param("ownerAuth0Id") String ownerAuth0Id,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}