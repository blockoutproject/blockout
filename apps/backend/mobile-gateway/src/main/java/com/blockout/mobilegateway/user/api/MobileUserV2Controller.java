package com.blockout.mobilegateway.user.api;

import com.blockout.mobilegateway.generated.api.MobileUsersApi;
import com.blockout.mobilegateway.generated.model.MobileUser;
import com.blockout.mobilegateway.generated.model.MobileUserFavorite;
import com.blockout.mobilegateway.generated.model.UpdateMobileUserRequest;
import com.blockout.mobilegateway.shared.api.BinaryParts;
import com.blockout.mobilegateway.user.application.MobileUserWorkflow;
import com.blockout.shared.model.EntityTypeEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class MobileUserV2Controller implements MobileUsersApi {

    private final MobileUserWorkflow workflow;

    @Override
    public ResponseEntity<MobileUser> updateMobileUser(
            String auth0Id, UpdateMobileUserRequest data, MultipartFile image) {
        var command = new MobileUserWorkflow.UpdateCommand(data.getPseudo(), data.getRemovePicture());
        return ResponseEntity.ok(response(workflow.update(auth0Id, command, BinaryParts.from(image))));
    }

    @Override
    public ResponseEntity<MobileUser> ensureCurrentMobileUser() {
        return ResponseEntity.ok(response(workflow.ensureCurrent()));
    }

    @Override
    public ResponseEntity<Void> deleteCurrentMobileUser() {
        workflow.deleteCurrent();
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> followMobileEntity(EntityTypeEnum entityType, Long entityId) {
        workflow.follow(entityType, entityId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> unfollowMobileEntity(EntityTypeEnum entityType, Long entityId) {
        workflow.unfollow(entityType, entityId);
        return ResponseEntity.noContent().build();
    }

    private MobileUser response(MobileUserWorkflow.UserView view) {
        return new MobileUser(
                view.id(), view.auth0Id(), view.email(), view.pseudo(), view.pictureUrl(),
                view.favorites().stream()
                        .map(item -> new MobileUserFavorite(item.entityType(), item.entityId()))
                        .toList());
    }
}
