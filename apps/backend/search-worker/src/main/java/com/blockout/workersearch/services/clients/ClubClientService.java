package com.blockout.workersearch.services.clients;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.club.ClubDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public List<ClubDTO> listActiveClubs() {
        String baseUrl = apiClientProperties.getClub().getUrl();
        String url = UriComponentsBuilder
                .fromUriString(baseUrl)
                .queryParam("active", true)
                .build()
                .toUriString();

        ResponseEntity<ClubDTO[]> response = apiClientService.get(url, ClubDTO[].class);
        ClubDTO[] body = response.getBody();

        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public ClubDTO getClubById(Long id) {
        String url = apiClientProperties.getClub().getUrl() + "/" + id;

        ResponseEntity<ClubDTO> response = apiClientService.get(url, ClubDTO.class);
        return response.getBody();
    }
}