package com.blockout.matches.match.live.report.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchLiveLinkReportRepository extends JpaRepository<MatchLiveLinkReport, Long> {

    boolean existsByLiveLink_IdAndReporterAuth0Id(Long liveLinkId, String reporterAuth0Id);

    long countByLiveLink_Id(Long liveLinkId);
}
