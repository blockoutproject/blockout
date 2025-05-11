package com.blockout.search.services.client;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.blockout.search.models.dto.club.Club;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubClientService {

    private static final Logger logger = LoggerFactory.getLogger(ClubClientService.class);

    private final ApiClientService apiClientService;

    @Value("${api.club.url}")
    private String clubApiUrl;

    public List<Club> listClubs() {
        String url = clubApiUrl;
        logger.info("Calling listClubs endpoint",
                keyValue("action", "call_club_list_endpoint"),
                keyValue("url", url));

        try {
            ResponseEntity<Club[]> response = apiClientService.get(url, Club[].class);
            Club[] body = response.getBody();
            List<Club> clubs = body != null ? Arrays.asList(body) : Collections.emptyList();

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