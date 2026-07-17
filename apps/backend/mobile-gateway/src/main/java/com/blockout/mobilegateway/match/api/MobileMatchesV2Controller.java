package com.blockout.mobilegateway.match.api;

import com.blockout.mobilegateway.generated.api.MobileMatchesApi;
import com.blockout.mobilegateway.generated.model.MobileMatchDayPageResponse;
import com.blockout.mobilegateway.generated.model.MobileMatchDetail;
import com.blockout.mobilegateway.match.application.MobileMatchWorkflow;
import com.blockout.shared.model.MatchStatusEnum;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Implements generated public mobile match operations. */
@RestController
@RequiredArgsConstructor
public class MobileMatchesV2Controller implements MobileMatchesApi {

    private final MobileMatchWorkflow workflow;

    /** Returns one enriched match detail. */
    @Override
    public ResponseEntity<MobileMatchDetail> getMobileMatch(Long id) {
        return ResponseEntity.ok(MobileMatchResponses.detail(workflow.get(id)));
    }

    /** Returns one enriched date-count match page. */
    @Override
    public ResponseEntity<MobileMatchDayPageResponse> listMobileMatchDays(
            MatchStatusEnum status, Integer page, Integer pageSize, List<Long> poolIds, List<Long> teamIds) {
        return ResponseEntity.ok(MobileMatchResponses.days(
                workflow.list(status, page, pageSize, poolIds, teamIds)));
    }
}
