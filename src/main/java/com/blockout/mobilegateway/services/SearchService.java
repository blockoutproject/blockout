package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.search.ClubSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.PoolSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.TeamSearchDocDTO;
import com.blockout.mobilegateway.services.clients.SearchClientService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class SearchService {

    private static final Logger logger = LoggerFactory.getLogger(SearchService.class);
    private final SearchClientService searchClientService;

    public List<ClubSearchDocDTO> searchClubs(String query) {
        logger.info("Searching clubs",
                keyValue("action", "search_clubs"),
                keyValue("query", query));
        List<ClubSearchDocDTO> results = searchClientService.searchClubs(query);
        return results;
    }

    public List<PoolSearchDocDTO> searchPools(String query, String season, Long divisionId, String format) {
        logger.info("Searching pools",
                keyValue("action", "search_pools"),
                keyValue("query", query),
                keyValue("season", season),
                keyValue("divisionId", divisionId),
                keyValue("format", format));
        return searchClientService.searchPools(query, season, divisionId, format);
    }

    public List<TeamSearchDocDTO> searchTeams(String query, String season, Long divisionId, String format) {
        logger.info("Searching teams",
                keyValue("action", "search_teams"),
                keyValue("query", query),
                keyValue("season", season),
                keyValue("divisionId", divisionId),
                keyValue("format", format));
        return searchClientService.searchTeams(query, season, divisionId, format);
    }
}