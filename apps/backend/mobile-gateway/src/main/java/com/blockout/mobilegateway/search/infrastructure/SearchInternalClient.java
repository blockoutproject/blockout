package com.blockout.mobilegateway.search.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.search.api.models.ClubSearchResponse;
import com.blockout.mobilegateway.search.api.models.PoolSearchResponse;
import com.blockout.mobilegateway.search.api.models.TeamSearchResponse;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;

    private String baseUrl() {
        return apiClientProperties.getSearch().getUrl();
    }

    public List<ClubSearchResponse> searchClubs(String query) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("clubs")
            .queryParam("query", query)
            .build()
            .toUriString();

        ResponseEntity<ClubSearchResponse[]> response = internalApiClient.get(url, ClubSearchResponse[].class);

        ClubSearchResponse[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public List<PoolSearchResponse> searchPools(String query, String season, Long divisionId, String format,
                                                String gender) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("pools")
            .queryParam("query", query);

        if (season != null && !season.isBlank()) {
            builder.queryParam("season", season);
        }
        if (divisionId != null) {
            builder.queryParam("divisionId", divisionId);
        }
        if (format != null) {
            builder.queryParam("format", format);
        }
        if (gender != null) {
            builder.queryParam("gender", gender);
        }

        String url = builder.build().toUriString();

        ResponseEntity<PoolSearchResponse[]> response = internalApiClient.get(url, PoolSearchResponse[].class);

        PoolSearchResponse[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public List<TeamSearchResponse> searchTeams(String query, String season, Long divisionId, String format,
                                                String gender) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("teams")
            .queryParam("query", query);

        if (season != null && !season.isBlank()) {
            builder.queryParam("season", season);
        }
        if (divisionId != null) {
            builder.queryParam("divisionId", divisionId);
        }
        if (format != null) {
            builder.queryParam("format", format);
        }
        if (gender != null) {
            builder.queryParam("gender", gender);
        }

        String url = builder.build().toUriString();

        ResponseEntity<TeamSearchResponse[]> response = internalApiClient.get(url, TeamSearchResponse[].class);

        TeamSearchResponse[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}
