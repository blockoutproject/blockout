package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.club.ClubDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ClubClientService {

    private static final Logger logger = LoggerFactory.getLogger(ClubClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    /**
     * Récupère un club entier via son ID.
     */
    public ClubDTO getClubById(String id) {
        String url = apiClientProperties.getClub().getUrl() + "/" + id;

        logger.info("Calling getClubById",
                keyValue("action", "call_club_get_by_id"),
                keyValue("id", id),
                keyValue("url", url));

        ResponseEntity<ClubDTO> response = apiClientService.get(url, ClubDTO.class);
        return response.getBody();
    }

    /**
     * Récupère (si présent) l'URL du logo d'un club.
     */
    public String getClubLogoUrl(String id) {
        String url = apiClientProperties.getClub().getUrl() + "/" + id + "/logo";

        ResponseEntity<String> response = apiClientService.get(url, String.class);

        if (response.getStatusCode() == HttpStatus.NO_CONTENT ||
                response.getBody() == null ||
                response.getBody().isBlank()) {
            return null;
        }

        return response.getBody();
    }

    public List<ClubDTO> getClubsByIds(Set<String> ids) {
        if (ids == null || ids.isEmpty())
            return Collections.emptyList();

        String url = UriComponentsBuilder
                .fromUriString(apiClientProperties.getClub().getUrl())
                .queryParam("ids", ids)
                .build()
                .toUriString();

        logger.info("Calling getClubsByIds", keyValue("ids", ids), keyValue("url", url));

        ResponseEntity<ClubDTO[]> response = apiClientService.get(url, ClubDTO[].class);
        ClubDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}