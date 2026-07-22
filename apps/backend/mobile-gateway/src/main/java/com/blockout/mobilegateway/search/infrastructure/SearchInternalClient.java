package com.blockout.mobilegateway.search.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.search.api.models.ClubSearchResponse;
import com.blockout.mobilegateway.search.api.models.PoolSearchResponse;
import com.blockout.mobilegateway.search.api.models.TeamSearchResponse;
import com.blockout.mobilegateway.search.infrastructure.contract.models.ClubSearchInternalResponse;
import com.blockout.mobilegateway.search.infrastructure.contract.models.PoolSearchInternalResponse;
import com.blockout.mobilegateway.search.infrastructure.contract.models.TeamSearchInternalResponse;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Reads the generated internal Search contract and exposes gateway public models. */
@Service
@RequiredArgsConstructor
public class SearchInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final SearchContractMapper mapper;

    private String baseUrl() {
        return apiClientProperties.getSearch().getUrl();
    }

    public List<ClubSearchResponse> searchClubs(String query) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("clubs")
            .queryParam("query", query)
            .build()
            .toUriString();

        ResponseEntity<ClubSearchInternalResponse[]> response =
            internalApiClient.get(url, ClubSearchInternalResponse[].class);

        ClubSearchInternalResponse[] body = response.getBody();
        return body != null ? Arrays.stream(body).map(mapper::toResponse).toList() : Collections.emptyList();
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

        ResponseEntity<PoolSearchInternalResponse[]> response =
            internalApiClient.get(url, PoolSearchInternalResponse[].class);

        PoolSearchInternalResponse[] body = response.getBody();
        return body != null ? Arrays.stream(body).map(mapper::toResponse).toList() : Collections.emptyList();
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

        ResponseEntity<TeamSearchInternalResponse[]> response =
            internalApiClient.get(url, TeamSearchInternalResponse[].class);

        TeamSearchInternalResponse[] body = response.getBody();
        return body != null ? Arrays.stream(body).map(mapper::toResponse).toList() : Collections.emptyList();
    }
}
