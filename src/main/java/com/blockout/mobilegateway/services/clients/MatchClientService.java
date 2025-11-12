package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.match.DayPageDTO;
import com.blockout.mobilegateway.models.dto.match.MatchDTO;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
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

    private String baseUrl() {
        return apiClientProperties.getMatch().getUrl();
    }

    public DayPageDTO getMatchesByDay(int page, int size, List<Long> poolIds, List<Long> teamIds, String status) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("day-groups")
                .queryParam("page", page)
                .queryParam("size", size)
                .queryParam("active", true)
                .queryParamIfPresent("status", Optional.ofNullable(status))
                .queryParamIfPresent("pool_ids", Optional.ofNullable(poolIds))
                .queryParamIfPresent("team_ids", Optional.ofNullable(teamIds))
                .build()
                .toUriString();

        logger.info("Calling matches#getByDay",
                keyValue("url", url),
                keyValue("page", page),
                keyValue("size", size),
                keyValue("status", status),
                keyValue("poolIds", poolIds),
                keyValue("teamIds", teamIds));

        ResponseEntity<DayPageDTO> response = apiClientService.get(url, DayPageDTO.class);
        return response.getBody();
    }

    public MatchDTO getMatchById(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString())
                .build()
                .toUriString();

        logger.info("Calling matches#getById", keyValue("matchId", matchId), keyValue("url", url));

        ResponseEntity<MatchDTO> response = apiClientService.get(url, MatchDTO.class);
        return response.getBody();
    }
}