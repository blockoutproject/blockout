package com.blockout.mobilegateway.club.api;

import com.blockout.mobilegateway.club.application.MobileClubWorkflow;
import com.blockout.mobilegateway.generated.api.MobileClubsApi;
import com.blockout.mobilegateway.generated.model.MobileClubDetail;
import com.blockout.mobilegateway.generated.model.UpdateMobileClubRequest;
import com.blockout.mobilegateway.shared.api.BinaryParts;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class MobileClubsV2Controller implements MobileClubsApi {

    private final MobileClubWorkflow workflow;

    @Override
    public ResponseEntity<MobileClubDetail> getMobileClub(String id) {
        return ResponseEntity.ok(response(workflow.get(id)));
    }

    @Override
    public ResponseEntity<MobileClubDetail> updateMobileClub(
            String id, UpdateMobileClubRequest data, MultipartFile image) {
        var command = new MobileClubWorkflow.UpdateCommand(data.getName(), data.getRemoveLogo());
        return ResponseEntity.ok(response(workflow.update(id, command, BinaryParts.from(image))));
    }

    private MobileClubDetail response(MobileClubWorkflow.ClubView value) {
        return new MobileClubDetail(value.id(), value.rawName(), value.name(), value.address(), value.city(),
                value.email(), value.website(), value.logoUrl(), value.latitude(), value.longitude());
    }
}
