package com.blockout.workersearch.services.clients;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.club.ClubDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubClientService {

    private static final Logger logger = LoggerFactory.getLogger(ClubClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public List<ClubDTO> listClubs() {
        String url = apiClientProperties.getClub().getUrl();

        logger.info("Calling listClubs endpoint",
                keyValue("action", "call_club_list_endpoint"),
                keyValue("url", url));

        ResponseEntity<ClubDTO[]> response = apiClientService.get(url, ClubDTO[].class);
        ClubDTO[] body = response.getBody();

        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public ClubDTO getClubById(Long id) {
        String url = apiClientProperties.getClub().getUrl() + "/" + id;

        logger.info("Calling getClubById",
                keyValue("action", "call_club_get_by_id"),
                keyValue("id", id),
                keyValue("url", url));

        ResponseEntity<ClubDTO> response = apiClientService.get(url, ClubDTO.class);
        return response.getBody();
    }
}