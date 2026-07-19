package com.blockout.matches.match.application;

public interface MatchLiveLinkReportService {
    void reportLiveLink(Long matchId, String reason, String auth0Id);
}
