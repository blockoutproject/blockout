package com.blockout.mobilegateway.search.application;

import com.blockout.mobilegateway.search.api.models.ClubSearchResponse;
import com.blockout.mobilegateway.search.api.models.PoolSearchResponse;
import com.blockout.mobilegateway.search.api.models.TeamSearchResponse;
import com.blockout.mobilegateway.search.infrastructure.SearchInternalClient;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class SearchApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(SearchApplicationService.class);
    private final SearchInternalClient searchInternalClient;

    public List<ClubSearchResponse> searchClubs(String query) {
        logger.info("Searching clubs",
                keyValue("action", "search_clubs"),
                keyValue("query", query));
        List<ClubSearchResponse> results = searchInternalClient.searchClubs(query);
        return results;
    }

    public List<PoolSearchResponse> searchPools(String query, String season, Long divisionId, String format,
            String gender) {
        logger.info("Searching pools",
                keyValue("action", "search_pools"),
                keyValue("query", query),
                keyValue("season", season),
                keyValue("divisionId", divisionId),
                keyValue("format", format),
                keyValue("gender", gender));
        return searchInternalClient.searchPools(query, season, divisionId, format, gender);
    }

    public List<TeamSearchResponse> searchTeams(String query, String season, Long divisionId, String format,
            String gender) {
        logger.info("Searching teams",
                keyValue("action", "search_teams"),
                keyValue("query", query),
                keyValue("season", season),
                keyValue("divisionId", divisionId),
                keyValue("format", format),
                keyValue("gender", gender));
        return searchInternalClient.searchTeams(query, season, divisionId, format, gender);
    }
}