package com.blockout.workersearch.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.club.ClubDTO;

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

        try {
            ResponseEntity<ClubDTO[]> response = apiClientService.get(url, ClubDTO[].class);
            ClubDTO[] body = response.getBody();
            List<ClubDTO> clubs = body != null ? Arrays.asList(body) : Collections.emptyList();

            logger.info("Successfully fetched clubs",
                    keyValue("count", clubs.size()));

            return clubs;
        } catch (Exception e) {
            logger.error("Failed to fetch clubs from Club API",
                    keyValue("url", url),
                    keyValue("error", e.getMessage()), e);
            return Collections.emptyList();
        }
    }
}