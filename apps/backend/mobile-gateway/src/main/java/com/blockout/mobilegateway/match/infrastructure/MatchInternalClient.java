package com.blockout.mobilegateway.match.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.match.api.models.*;
import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Optional;

/** Calls the generated matches-service contract through the shared HTTP adapter. */
@Service
@RequiredArgsConstructor
public class MatchInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final MatchContractMapper contractMapper;

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
            .queryParamIfPresent("poolIds", Optional.ofNullable(poolIds))
            .queryParamIfPresent("teamIds", Optional.ofNullable(teamIds))
            .build()
            .toUriString();

        var response = internalApiClient.get(url,
            com.blockout.mobilegateway.match.infrastructure.contract.models.DayPageInternalResponse.class);
        return contractMapper.toResponse(response.getBody());
    }

    public MatchInternalResponse getMatchById(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(matchId.toString())
            .build()
            .toUriString();

        var response = internalApiClient.get(url,
            com.blockout.mobilegateway.match.infrastructure.contract.models.MatchInternalResponse.class);
        return contractMapper.toResponse(response.getBody());
    }

    public List<MatchLiveSummaryInternalResponse> listMatchesForLiveModeration(LiveLinkStatus statusFilter) {
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromUriString(baseUrl())
            .pathSegment("live-moderation");

        if (statusFilter != null) {
            builder.queryParam("status", statusFilter.name());
        }

        String url = builder.build().toUriString();

        var response = internalApiClient.get(url,
            com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveSummaryInternalResponse[].class);

        var body = response.getBody();
        return body != null ? java.util.Arrays.stream(body).map(contractMapper::toResponse).toList() : List.of();
    }

    public UpsertMatchLiveLinkResponse upsertLiveLink(Long matchId, UpsertMatchLiveLinkRequest request) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(matchId.toString(), "live-link")
            .build()
            .toUriString();

        var response = internalApiClient.post(
            url,
            contractMapper.toInternalRequest(request),
            com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveLinkResultInternalResponse.class);

        return contractMapper.toResponse(response.getBody());
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

        internalApiClient.post(url, contractMapper.toInternalRequest(request), Void.class);
    }

    public List<MatchLiveLinkInternalResponse> getLiveLinksHistory(Long matchId) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(matchId.toString(), "live-links")
            .build()
            .toUriString();

        var response = internalApiClient.get(url,
            com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveLinkInternalResponse[].class);

        var body = response.getBody();
        return body != null ? java.util.Arrays.stream(body).map(contractMapper::toResponse).toList() : List.of();
    }

    public List<MatchLiveLinkInternalResponse> listPendingLiveLinks() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("live-links", "pending")
            .build()
            .toUriString();

        var response = internalApiClient.get(url,
            com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveLinkInternalResponse[].class);

        var body = response.getBody();
        return body != null ? java.util.Arrays.stream(body).map(contractMapper::toResponse).toList() : List.of();
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
