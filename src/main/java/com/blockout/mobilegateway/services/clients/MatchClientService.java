package com.blockout.mobilegateway.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import com.blockout.mobilegateway.models.dto.match.DayPageDTO;

import java.util.List;
import java.util.Optional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MatchClientService {

    private static final Logger logger = LoggerFactory.getLogger(MatchClientService.class);

    private final ApiClientService apiClientService;

    @Value("${api.match.url}")
    private String matchApiUrl;

    public DayPageDTO getMatchesByDay(int page, int size, List<Long> poolIds, List<Long> teamIds, String status) {
        String url = UriComponentsBuilder
                .fromUriString(matchApiUrl + "/day-groups")
                .queryParam("page", page)
                .queryParam("size", size)
                .queryParamIfPresent("status", Optional.ofNullable(status))
                .queryParamIfPresent("pool_ids", Optional.ofNullable(poolIds))
                .queryParamIfPresent("team_ids", Optional.ofNullable(teamIds))
                .build()
                .toUriString();

        logger.info("Calling getMatchesByDay",
                keyValue("url", url),
                keyValue("page", page),
                keyValue("status", status));

        try {
            ResponseEntity<DayPageDTO> response = apiClientService.get(url, DayPageDTO.class);
            System.out.println("Response: " + response.getBody());
            return response.getBody();
        } catch (Exception e) {
            logger.error("Failed to fetch matches", keyValue("url", url), keyValue("error", e.getMessage()), e);
            return new DayPageDTO(); // avec liste vide
        }
    }
}