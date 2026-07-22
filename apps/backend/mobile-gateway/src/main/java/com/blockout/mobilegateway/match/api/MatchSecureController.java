package com.blockout.mobilegateway.match.api;

import com.blockout.mobilegateway.match.api.mappers.MatchApiMapper;
import com.blockout.mobilegateway.api.MatchSecureApi;
import com.blockout.mobilegateway.api.models.MatchLiveLinkHistoryResponse;
import com.blockout.mobilegateway.api.models.MatchLiveSummaryResponse;
import com.blockout.mobilegateway.api.models.ReportMatchLiveLinkRequest;
import com.blockout.mobilegateway.api.models.UpsertMatchLiveLinkRequest;
import com.blockout.mobilegateway.api.models.UpsertMatchLiveLinkResponse;
import com.blockout.mobilegateway.match.application.MatchApplicationService;
import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.shared.model.LiveLinkStatusEnum;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MatchSecureController implements MatchSecureApi {

    private final MatchApplicationService matchService;
    private final MatchApiMapper mapper;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<UpsertMatchLiveLinkResponse> upsertLiveLink(
            Long matchId, UpsertMatchLiveLinkRequest request) {
        return ResponseEntity.ok(
            mapper.toResponse(matchService.upsertLiveLink(matchId, mapper.toCommand(request))));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> deleteLiveLink(Long matchId) {
        matchService.deleteLiveLink(matchId);
        return ResponseEntity.noContent().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> reportLiveLink(Long matchId, ReportMatchLiveLinkRequest request) {
        matchService.reportLiveLink(matchId, mapper.toCommand(request));
        return ResponseEntity.noContent().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<List<MatchLiveLinkHistoryResponse>> getLiveLinksHistory(Long matchId) {
        return ResponseEntity.ok(
            matchService.getLiveLinksHistory(matchId).stream().map(mapper::toResponse).toList());
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<List<MatchLiveSummaryResponse>> listMatchesForLiveModeration(
            LiveLinkStatusEnum status) {
        LiveLinkStatus filter = status == null ? null : LiveLinkStatus.valueOf(status.name());
        return ResponseEntity.ok(
            matchService.listMatchesForLiveModeration(filter).stream().map(mapper::toResponse).toList());
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> approvePendingLink(Long liveLinkId) {
        matchService.approvePendingLiveLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> rejectPendingLink(Long liveLinkId) {
        matchService.rejectPendingLiveLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> reactivateLiveLink(Long liveLinkId) {
        matchService.reactivateLiveLink(liveLinkId);
        return ResponseEntity.noContent().build();
    }
}
