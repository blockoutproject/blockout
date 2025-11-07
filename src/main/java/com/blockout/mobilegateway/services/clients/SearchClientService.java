package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.search.ClubSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.PoolSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.TeamSearchDocDTO;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class SearchClientService {

    private static final Logger logger = LoggerFactory.getLogger(SearchClientService.class);

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

        logger.info("Calling search#clubs", keyValue("query", query), keyValue("url", url));

        ResponseEntity<ClubSearchDocDTO[]> response = apiClientService.get(url, ClubSearchDocDTO[].class);
        ClubSearchDocDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public List<PoolSearchDocDTO> searchPools(String query) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("pools")
                .queryParam("query", query)
                .build()
                .toUriString();

        logger.info("Calling search#pools", keyValue("query", query), keyValue("url", url));

        ResponseEntity<PoolSearchDocDTO[]> response = apiClientService.get(url, PoolSearchDocDTO[].class);
        PoolSearchDocDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public List<TeamSearchDocDTO> searchTeams(String query) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("teams")
                .queryParam("query", query)
                .build()
                .toUriString();

        logger.info("Calling search#teams", keyValue("query", query), keyValue("url", url));

        ResponseEntity<TeamSearchDocDTO[]> response = apiClientService.get(url, TeamSearchDocDTO[].class);
        TeamSearchDocDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}