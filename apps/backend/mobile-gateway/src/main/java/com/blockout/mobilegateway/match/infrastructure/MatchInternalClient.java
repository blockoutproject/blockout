package com.blockout.mobilegateway.match.infrastructure;

import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.match.api.models.DayPageInternalResponse;
import com.blockout.mobilegateway.match.api.models.MatchInternalResponse;
import com.blockout.mobilegateway.match.api.models.MatchLiveLinkInternalResponse;
import com.blockout.mobilegateway.match.api.models.ReportMatchLiveLinkRequest;
import com.blockout.mobilegateway.match.api.models.UpsertMatchLiveLinkRequest;
import com.blockout.mobilegateway.match.api.models.UpsertMatchLiveLinkResponse;
import com.blockout.mobilegateway.match.api.models.MatchLiveSummaryInternalResponse;
import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MatchInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;

    private String baseUrl() {
        return apiClientProperties.getMatch().getUrl();
    }

    public DayPageInternalResponse getMatchesByDay(int page, int size, List<Long> poolIds, List<Long> teamIds, String status) {
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

        ResponseEntity<DayPageInternalResponse> response = internalApiClient.get(url, DayPageInternalResponse.class);
        return response.getBody();
    }

    public MatchInternalResponse getMatchById(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString())
                .build()
                .toUriString();

        ResponseEntity<MatchInternalResponse> response = internalApiClient.get(url, MatchInternalResponse.class);
        return response.getBody();
    }

    public List<MatchLiveSummaryInternalResponse> listMatchesForLiveModeration(LiveLinkStatus statusFilter) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(baseUrl())
                .pathSegment("live-moderation");

        if (statusFilter != null) {
            builder.queryParam("status", statusFilter.name());
        }

        String url = builder.build().toUriString();

        ResponseEntity<MatchLiveSummaryInternalResponse[]> response = internalApiClient.get(url, MatchLiveSummaryInternalResponse[].class);

        MatchLiveSummaryInternalResponse[] body = response.getBody();
        return body != null ? List.of(body) : List.of();
    }

    public UpsertMatchLiveLinkResponse upsertLiveLink(Long matchId, UpsertMatchLiveLinkRequest request) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-link")
                .build()
                .toUriString();

        ResponseEntity<UpsertMatchLiveLinkResponse> response = internalApiClient.post(
                url,
                request,
                UpsertMatchLiveLinkResponse.class);

        return response.getBody();
    }

    public void deleteLiveLink(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-link")
                .build()
                .toUriString();

        internalApiClient.delete(url, Void.class);
    }

    public void reportLiveLink(Long matchId, ReportMatchLiveLinkRequest request) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-link", "report")
                .build()
                .toUriString();

        internalApiClient.post(url, request, Void.class);
    }

    public List<MatchLiveLinkInternalResponse> getLiveLinksHistory(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(matchId.toString(), "live-links")
                .build()
                .toUriString();

        ResponseEntity<MatchLiveLinkInternalResponse[]> response = internalApiClient.get(url, MatchLiveLinkInternalResponse[].class);

        MatchLiveLinkInternalResponse[] body = response.getBody();
        return body != null ? List.of(body) : List.of();
    }

    public List<MatchLiveLinkInternalResponse> listPendingLiveLinks() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", "pending")
                .build()
                .toUriString();

        ResponseEntity<MatchLiveLinkInternalResponse[]> response = internalApiClient.get(url, MatchLiveLinkInternalResponse[].class);

        MatchLiveLinkInternalResponse[] body = response.getBody();
        return body != null ? List.of(body) : List.of();
    }

    public void approvePendingLiveLink(Long liveLinkId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", liveLinkId.toString(), "approve")
                .build()
                .toUriString();

        internalApiClient.post(url, null, Void.class);
    }

    public void rejectPendingLiveLink(Long liveLinkId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", liveLinkId.toString(), "reject")
                .build()
                .toUriString();

        internalApiClient.post(url, null, Void.class);
    }

    public void reactivateLiveLink(Long liveLinkId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("live-links", liveLinkId.toString(), "reactivate")
                .build()
                .toUriString();

        internalApiClient.post(url, null, Void.class);
    }
}
