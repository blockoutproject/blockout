package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.competition.CompetitionAssociationDTO;
import com.blockout.mobilegateway.models.dto.competition.PoolWithRankingDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
@RequiredArgsConstructor
public class CompetitionClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    private String baseUrl() {
        return apiClientProperties.getCompetition().getUrl();
    }

    public List<CompetitionAssociationDTO> getAssociationsByTeam(Long teamId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("teams", teamId.toString(), "pools")
                .build().toUriString();

        ResponseEntity<CompetitionAssociationDTO[]> response = apiClientService.get(url, CompetitionAssociationDTO[].class);
        return Optional.ofNullable(response.getBody()).map(Arrays::asList).orElse(Collections.emptyList());
    }

    public List<CompetitionAssociationDTO> getAssociationsByPool(Long poolId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("pools", poolId.toString(), "teams")
                .build().toUriString();

        ResponseEntity<CompetitionAssociationDTO[]> response = apiClientService.get(url, CompetitionAssociationDTO[].class);
        return Optional.ofNullable(response.getBody()).map(Arrays::asList).orElse(Collections.emptyList());
    }

    public List<PoolWithRankingDTO> getPoolsWithRankingByTeam(Long teamId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("teams", teamId.toString(), "pools-with-ranking")
                .build().toUriString();

        ResponseEntity<PoolWithRankingDTO[]> response = apiClientService.get(url, PoolWithRankingDTO[].class);
        return Optional.ofNullable(response.getBody()).map(Arrays::asList).orElse(Collections.emptyList());
    }
}