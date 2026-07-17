package com.blockout.mobilegateway.match.api;

import com.blockout.mobilegateway.generated.api.MobileMatchModerationApi;
import com.blockout.mobilegateway.generated.model.MobileMatchLiveLinkHistoryPageResponse;
import com.blockout.mobilegateway.generated.model.MobileMatchModerationPageResponse;
import com.blockout.mobilegateway.match.application.MobileMatchLiveWorkflow;
import com.blockout.shared.model.LiveLinkStatusEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Implements generated authenticated mobile moderation operations. */
@RestController
@RequiredArgsConstructor
public class MobileMatchModerationV2Controller implements MobileMatchModerationApi {

    private final MobileMatchLiveWorkflow workflow;

    /** Approves one pending link. */
    @Override
    public ResponseEntity<Void> approveMobileMatchLiveLink(Long id) {
        workflow.approve(id);
        return ResponseEntity.noContent().build();
    }

    /** Returns one canonical match live-link history page. */
    @Override
    public ResponseEntity<MobileMatchLiveLinkHistoryPageResponse> listMobileMatchLiveLinkHistory(
            Long matchId, Integer page, Integer pageSize) {
        return ResponseEntity.ok(MobileMatchResponses.history(workflow.history(matchId, page, pageSize)));
    }

    /** Returns one enriched moderation page. */
    @Override
    public ResponseEntity<MobileMatchModerationPageResponse> listMobileMatchesForLiveModeration(
            LiveLinkStatusEnum status, Integer page, Integer pageSize) {
        return ResponseEntity.ok(MobileMatchResponses.moderation(workflow.moderation(status, page, pageSize)));
    }

    /** Reactivates one eligible link. */
    @Override
    public ResponseEntity<Void> reactivateMobileMatchLiveLink(Long id) {
        workflow.reactivate(id);
        return ResponseEntity.noContent().build();
    }

    /** Rejects one pending link. */
    @Override
    public ResponseEntity<Void> rejectMobileMatchLiveLink(Long id) {
        workflow.reject(id);
        return ResponseEntity.noContent().build();
    }
}
