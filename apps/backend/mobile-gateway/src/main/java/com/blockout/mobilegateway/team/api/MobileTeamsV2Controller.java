package com.blockout.mobilegateway.team.api;

import static com.blockout.mobilegateway.shared.api.MobileCatalogResponses.division;
import static com.blockout.mobilegateway.shared.api.MobileCatalogResponses.ranking;

import com.blockout.mobilegateway.generated.api.MobileTeamsApi;
import com.blockout.mobilegateway.generated.model.MobileTeamDetail;
import com.blockout.mobilegateway.generated.model.MobileTeamListResponse;
import com.blockout.mobilegateway.generated.model.MobileTeamPool;
import com.blockout.mobilegateway.generated.model.MobileTeamSummary;
import com.blockout.mobilegateway.generated.model.MobileTeamUpdated;
import com.blockout.mobilegateway.generated.model.UpdateMobileTeamRequest;
import com.blockout.mobilegateway.shared.api.BinaryParts;
import com.blockout.mobilegateway.team.application.MobileTeamWorkflow;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class MobileTeamsV2Controller implements MobileTeamsApi {

    private final MobileTeamWorkflow workflow;

    @Override
    public ResponseEntity<MobileTeamDetail> getMobileTeam(Long id) {
        return ResponseEntity.ok(detail(workflow.get(id)));
    }

    @Override
    public ResponseEntity<MobileTeamListResponse> listMobileTeamsByClub(String clubId) {
        return ResponseEntity.ok(list(workflow.listByClub(clubId)));
    }

    @Override
    public ResponseEntity<MobileTeamListResponse> listMobileTeamsByIds(List<Long> ids) {
        return ResponseEntity.ok(list(workflow.listByIds(ids)));
    }

    @Override
    public ResponseEntity<MobileTeamUpdated> updateMobileTeam(
            Long id, UpdateMobileTeamRequest data, MultipartFile image) {
        var command = new MobileTeamWorkflow.UpdateCommand(data.getName(), data.getShortName(), data.getRemoveLogo());
        var value = workflow.update(id, command, BinaryParts.from(image));
        return ResponseEntity.ok(new MobileTeamUpdated(value.id(), value.name(), value.shortName(), value.logoUrl()));
    }

    private MobileTeamDetail detail(MobileTeamWorkflow.DetailView value) {
        return new MobileTeamDetail(value.id(), value.clubId(), value.name(), value.shortName(), value.rawName(),
                value.format(), value.gender(), value.season(), value.followersCount(), division(value.division()),
                value.logoUrl(), value.pools().stream().map(this::pool).toList());
    }

    private MobileTeamPool pool(MobileTeamWorkflow.PoolView value) {
        return new MobileTeamPool(value.id(), value.leagueCode(), value.leagueName(), value.shortName(), value.gender(),
                value.ranking().stream().map(item -> ranking(item)).toList(), division(value.division()));
    }

    private MobileTeamListResponse list(List<MobileTeamWorkflow.SummaryView> values) {
        return new MobileTeamListResponse(values.stream()
                .map(value -> new MobileTeamSummary(value.id(), value.name(), value.shortName(), value.season(),
                        value.gender(), value.format(), value.logoUrl(), division(value.division())))
                .toList());
    }
}
