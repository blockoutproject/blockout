package com.blockout.mobilegateway.pool.api;

import static com.blockout.mobilegateway.shared.api.MobileCatalogResponses.division;
import static com.blockout.mobilegateway.shared.api.MobileCatalogResponses.ranking;

import com.blockout.mobilegateway.generated.api.MobilePoolsApi;
import com.blockout.mobilegateway.generated.model.MobilePoolDetail;
import com.blockout.mobilegateway.generated.model.MobilePoolListResponse;
import com.blockout.mobilegateway.generated.model.MobilePoolSummary;
import com.blockout.mobilegateway.generated.model.MobilePoolUpdated;
import com.blockout.mobilegateway.generated.model.UpdateMobilePoolRequest;
import com.blockout.mobilegateway.pool.application.MobilePoolWorkflow;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MobilePoolsV2Controller implements MobilePoolsApi {

    private final MobilePoolWorkflow workflow;

    @Override
    public ResponseEntity<MobilePoolDetail> getMobilePool(Long id) {
        var value = workflow.get(id);
        return ResponseEntity.ok(new MobilePoolDetail(value.id(), value.season(), value.leagueCode(),
                value.leagueName(), value.name(), value.shortName(), value.rawName(), value.gender(),
                value.followersCount(), value.ranking().stream().map(item -> ranking(item)).toList(),
                division(value.division())));
    }

    @Override
    public ResponseEntity<MobilePoolListResponse> listMobilePoolsByIds(List<Long> ids) {
        return ResponseEntity.ok(new MobilePoolListResponse(workflow.listByIds(ids).stream()
                .map(value -> new MobilePoolSummary(value.id(), value.name(), value.leagueName(), value.leagueCode(),
                        value.season(), value.gender(), value.format(), division(value.division())))
                .toList()));
    }

    @Override
    public ResponseEntity<MobilePoolUpdated> updateMobilePool(Long id, UpdateMobilePoolRequest request) {
        var value = workflow.update(id, new MobilePoolWorkflow.UpdateCommand(request.getName(), request.getShortName()));
        return ResponseEntity.ok(new MobilePoolUpdated(value.id(), value.name(), value.shortName()));
    }
}
