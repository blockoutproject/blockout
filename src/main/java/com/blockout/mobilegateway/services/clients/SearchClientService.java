package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.search.ClubSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.PoolSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.TeamSearchDocDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    private String baseUrl() {
        return apiClientProperties.getSearch().getUrl();
    }

    public List<ClubSearchDocDTO> searchClubs(String query) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("clubs")
                .queryParam("query", query)
                .build()
                .toUriString();

        ResponseEntity<ClubSearchDocDTO[]> response = apiClientService.get(url, ClubSearchDocDTO[].class);

        ClubSearchDocDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public List<PoolSearchDocDTO> searchPools(String query, String season, Long divisionId) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("pools")
                .queryParam("query", query);

        if (season != null && !season.isBlank()) {
            builder.queryParam("season", season);
        }

        if (divisionId != null) {
            builder.queryParam("division_id", divisionId);
        }

        String url = builder.build().toUriString();

        ResponseEntity<PoolSearchDocDTO[]> response = apiClientService.get(url, PoolSearchDocDTO[].class);

        PoolSearchDocDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public List<TeamSearchDocDTO> searchTeams(String query, String season, Long divisionId) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("teams")
                .queryParam("query", query);

        if (season != null && !season.isBlank()) {
            builder.queryParam("season", season);
        }

        if (divisionId != null) {
            builder.queryParam("division_id", divisionId);
        }

        String url = builder.build().toUriString();

        ResponseEntity<TeamSearchDocDTO[]> response = apiClientService.get(url, TeamSearchDocDTO[].class);

        TeamSearchDocDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}