package com.blockout.matches.match.infrastructure.persistence.repositories;

import com.blockout.matches.match.infrastructure.persistence.entities.MatchLiveLinkReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchLiveLinkReportRepository extends JpaRepository<MatchLiveLinkReportEntity, Long> {
    boolean existsByLiveLink_IdAndReporterAuth0Id(Long liveLinkId, String reporterAuth0Id);

    long countByLiveLink_Id(Long liveLinkId);
}
