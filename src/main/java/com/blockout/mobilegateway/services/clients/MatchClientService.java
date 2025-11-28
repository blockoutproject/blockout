// FICHIER: com/blockout/mobilegateway/services/clients/MatchClientService.java

package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.match.DayPageDTO;
import com.blockout.mobilegateway.models.dto.match.MatchDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkReportRequestDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkRequestDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveLinkResponseDTO;
import com.blockout.mobilegateway.models.dto.match.MatchLiveSummaryDTO;

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
                .queryParamIfPresent("status", Optional.ofNullable(status))
                // côté API matches tu as aussi "active", mais ici tu forces déjà active côté gateway
                .queryParam("active", true)
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

        logger.info("Calling matches#getById",
                keyValue("matchId", matchId),
                keyValue("url", url));

        ResponseEntity<MatchDTO> response = apiClientService.get(url, MatchDTO.class);
        return response.getBody();
    }

    public List<MatchLiveSummaryDTO> listMatchesForLiveModeration() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-moderation")
                .build()
                .toUriString();

        logger.info("Calling matches#listMatchesForLiveModeration",
                keyValue("url", url));

        ResponseEntity<MatchLiveSummaryDTO[]> response =
                apiClientService.get(url, MatchLiveSummaryDTO[].class);

        MatchLiveSummaryDTO[] body = response.getBody();
        return body != null ? List.of(body) : List.of();
    }

    public MatchLiveLinkResponseDTO upsertLiveLink(Long matchId, MatchLiveLinkRequestDTO request) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-link")
                .build()
                .toUriString();

        logger.info("Calling matches#upsertLiveLink",
                keyValue("match_id", matchId),
                keyValue("url", url));

        ResponseEntity<MatchLiveLinkResponseDTO> response = apiClientService.post(
                url,
                request,
                MatchLiveLinkResponseDTO.class
        );

        return response.getBody();
    }

    public void deleteLiveLink(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-link")
                .build()
                .toUriString();

        logger.info("Calling matches#deleteLiveLink",
                keyValue("match_id", matchId),
                keyValue("url", url));

        apiClientService.delete(url, Void.class);
    }

    public void reportLiveLink(Long matchId, MatchLiveLinkReportRequestDTO request) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-link", "report")
                .build()
                .toUriString();

        logger.info("Calling matches#reportLiveLink",
                keyValue("match_id", matchId),
                keyValue("url", url));

        apiClientService.post(url, request, Void.class);
    }

    public List<MatchLiveLinkDTO> getLiveLinksHistory(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-links")
                .build()
                .toUriString();

        logger.info("Calling matches#getLiveLinksHistory",
                keyValue("match_id", matchId),
                keyValue("url", url));

        ResponseEntity<MatchLiveLinkDTO[]> response =
                apiClientService.get(url, MatchLiveLinkDTO[].class);

        MatchLiveLinkDTO[] body = response.getBody();
        return body != null ? List.of(body) : List.of();
    }

    public List<MatchLiveLinkDTO> listPendingLiveLinks() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", "pending")
                .build()
                .toUriString();

        logger.info("Calling matches#listPendingLiveLinks",
                keyValue("url", url));

        ResponseEntity<MatchLiveLinkDTO[]> response =
                apiClientService.get(url, MatchLiveLinkDTO[].class);

        MatchLiveLinkDTO[] body = response.getBody();
        return body != null ? List.of(body) : List.of();
    }

    public void approvePendingLiveLink(Long liveLinkId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", liveLinkId.toString(), "approve")
                .build()
                .toUriString();

        logger.info("Calling matches#approvePendingLiveLink",
                keyValue("live_link_id", liveLinkId),
                keyValue("url", url));

        apiClientService.post(url, null, Void.class);
    }

    public void rejectPendingLiveLink(Long liveLinkId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", liveLinkId.toString(), "reject")
                .build()
                .toUriString();

        logger.info("Calling matches#rejectPendingLiveLink",
                keyValue("live_link_id", liveLinkId),
                keyValue("url", url));

        apiClientService.post(url, null, Void.class);
    }
}