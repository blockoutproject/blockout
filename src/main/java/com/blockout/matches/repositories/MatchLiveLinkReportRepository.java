package com.blockout.matches.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockout.matches.models.entities.MatchLiveLinkReport;

public interface MatchLiveLinkReportRepository extends JpaRepository<MatchLiveLinkReport, Long> {

    boolean existsByLiveLinkIdAndReporterAuth0Id(Long liveLinkId, String reporterAuth0Id);

    long countByLiveLinkId(Long liveLinkId);
}