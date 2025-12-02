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
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MatchClientService {

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
                .queryParam("active", true)
                .queryParamIfPresent("pool_ids", Optional.ofNullable(poolIds))
                .queryParamIfPresent("team_ids", Optional.ofNullable(teamIds))
                .build()
                .toUriString();

        ResponseEntity<DayPageDTO> response = apiClientService.get(url, DayPageDTO.class);
        return response.getBody();
    }

    public MatchDTO getMatchById(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString())
                .build()
                .toUriString();

        ResponseEntity<MatchDTO> response = apiClientService.get(url, MatchDTO.class);
        return response.getBody();
    }

    public List<MatchLiveSummaryDTO> listMatchesForLiveModeration() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-moderation")
                .build()
                .toUriString();

        ResponseEntity<MatchLiveSummaryDTO[]> response = apiClientService.get(url, MatchLiveSummaryDTO[].class);

        MatchLiveSummaryDTO[] body = response.getBody();
        return body != null ? List.of(body) : List.of();
    }

    public MatchLiveLinkResponseDTO upsertLiveLink(Long matchId, MatchLiveLinkRequestDTO request) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-link")
                .build()
                .toUriString();

        ResponseEntity<MatchLiveLinkResponseDTO> response = apiClientService.post(
                url,
                request,
                MatchLiveLinkResponseDTO.class);

        return response.getBody();
    }

    public void deleteLiveLink(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-link")
                .build()
                .toUriString();

        apiClientService.delete(url, Void.class);
    }

    public void reportLiveLink(Long matchId, MatchLiveLinkReportRequestDTO request) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-link", "report")
                .build()
                .toUriString();

        apiClientService.post(url, request, Void.class);
    }

    public List<MatchLiveLinkDTO> getLiveLinksHistory(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-links")
                .build()
                .toUriString();

        ResponseEntity<MatchLiveLinkDTO[]> response = apiClientService.get(url, MatchLiveLinkDTO[].class);

        MatchLiveLinkDTO[] body = response.getBody();
        return body != null ? List.of(body) : List.of();
    }

    public List<MatchLiveLinkDTO> listPendingLiveLinks() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", "pending")
                .build()
                .toUriString();

        ResponseEntity<MatchLiveLinkDTO[]> response = apiClientService.get(url, MatchLiveLinkDTO[].class);

        MatchLiveLinkDTO[] body = response.getBody();
        return body != null ? List.of(body) : List.of();
    }

    public void approvePendingLiveLink(Long liveLinkId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", liveLinkId.toString(), "approve")
                .build()
                .toUriString();

        apiClientService.post(url, null, Void.class);
    }

    public void rejectPendingLiveLink(Long liveLinkId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", liveLinkId.toString(), "reject")
                .build()
                .toUriString();

        apiClientService.post(url, null, Void.class);
    }

    public void reactivateLiveLink(Long liveLinkId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", liveLinkId.toString(), "reactivate")
                .build()
                .toUriString();

        apiClientService.post(url, null, Void.class);
    }
}