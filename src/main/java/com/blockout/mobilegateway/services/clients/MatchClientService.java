package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.exceptions.MatchNotFoundException;
import com.blockout.mobilegateway.models.dto.match.DayPageDTO;
import com.blockout.mobilegateway.models.dto.match.MatchDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Optional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MatchClientService {

    private static final Logger logger = LoggerFactory.getLogger(MatchClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public DayPageDTO getMatchesByDay(int page, int size, List<Long> poolIds, List<Long> teamIds, String status) {
        String matchApiUrl = apiClientProperties.getMatch().getUrl();
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
            return response.getBody();
        } catch (Exception e) {
            logger.error("Failed to fetch matches", keyValue("url", url), keyValue("error", e.getMessage()), e);
            throw new RuntimeException("Erreur lors de la récupération des matchs", e);
        }
    }

    public MatchDTO getMatchById(Long matchId) {
        String matchApiUrl = apiClientProperties.getMatch().getUrl();
        String url = matchApiUrl + "/" + matchId;

        logger.info("Calling getMatchById",
                keyValue("url", url),
                keyValue("matchId", matchId));

        try {
            ResponseEntity<MatchDTO> response = apiClientService.get(url, MatchDTO.class);
            return response.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            logger.warn("Match not found", keyValue("matchId", matchId));
            throw new MatchNotFoundException(matchId);
        } catch (Exception e) {
            logger.error("Failed to fetch match by ID",
                    keyValue("url", url),
                    keyValue("matchId", matchId),
                    keyValue("error", e.getMessage()), e);
            throw new RuntimeException("Erreur lors de la récupération du match", e);
        }
    }
}