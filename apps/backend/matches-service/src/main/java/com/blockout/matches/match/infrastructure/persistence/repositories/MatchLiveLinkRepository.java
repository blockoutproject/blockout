package com.blockout.matches.match.infrastructure.persistence.repositories;

import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchLiveLinkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MatchLiveLinkRepository extends JpaRepository<MatchLiveLinkEntity, Long> {

    Optional<MatchLiveLinkEntity> findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(Long matchId, LiveLinkStatus status);

    List<MatchLiveLinkEntity> findByMatch_Id(Long matchId);

    long countByMatch_IdAndOwnerAuth0Id(Long matchId, String ownerAuth0Id);

    @Query("""
        SELECT COUNT(DISTINCT l.match.id) FROM MatchLiveLinkEntity l
        WHERE l.ownerAuth0Id = :ownerAuth0Id AND l.createdAt BETWEEN :start AND :end
        """)
    long countDistinctMatchesByOwnerAndDay(
        @Param("ownerAuth0Id") String ownerAuth0Id,
        @Param("start") Instant start,
        @Param("end") Instant end);

    List<MatchLiveLinkEntity> findByMatch_IdAndOwnerAuth0IdAndStatus(
        Long matchId, String ownerAuth0Id, LiveLinkStatus status);

    Optional<MatchLiveLinkEntity> findFirstByMatch_IdAndOwnerAuth0IdOrderByCreatedAtDesc(
        Long matchId, String ownerAuth0Id);

    @Query("""
        SELECT l FROM MatchLiveLinkEntity l
        WHERE l.match.id IN :matchIds AND l.status = :status
        """)
    List<MatchLiveLinkEntity> findByMatchIdInAndStatus(
        @Param("matchIds") List<Long> matchIds,
        @Param("status") LiveLinkStatus status);
}
