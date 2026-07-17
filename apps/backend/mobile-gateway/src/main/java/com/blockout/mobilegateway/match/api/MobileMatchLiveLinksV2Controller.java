package com.blockout.mobilegateway.match.api;

import com.blockout.mobilegateway.generated.api.MobileMatchLiveLinksApi;
import com.blockout.mobilegateway.generated.model.MobileMatchLiveLinkResult;
import com.blockout.mobilegateway.generated.model.ReportMobileMatchLiveLinkRequest;
import com.blockout.mobilegateway.generated.model.UpsertMobileMatchLiveLinkRequest;
import com.blockout.mobilegateway.match.application.MobileMatchLiveWorkflow;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Implements generated authenticated mobile live-link commands. */
@RestController
@RequiredArgsConstructor
public class MobileMatchLiveLinksV2Controller implements MobileMatchLiveLinksApi {

    private final MobileMatchLiveWorkflow workflow;

    /** Deactivates the active link when present. */
    @Override
    public ResponseEntity<Void> deleteMobileMatchLiveLink(Long matchId) {
        workflow.delete(matchId);
        return ResponseEntity.noContent().build();
    }

    /** Reports the active link. */
    @Override
    public ResponseEntity<Void> reportMobileMatchLiveLink(
            Long matchId, ReportMobileMatchLiveLinkRequest request) {
        workflow.report(matchId, request.getReason());
        return ResponseEntity.noContent().build();
    }

    /** Creates or replaces the active link. */
    @Override
    public ResponseEntity<MobileMatchLiveLinkResult> upsertMobileMatchLiveLink(
            Long matchId, UpsertMobileMatchLiveLinkRequest request) {
        return ResponseEntity.ok(MobileMatchResponses.liveLink(workflow.upsert(matchId, request.getUrl())));
    }
}
