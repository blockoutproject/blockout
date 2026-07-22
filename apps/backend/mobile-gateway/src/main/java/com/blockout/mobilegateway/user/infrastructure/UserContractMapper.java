package com.blockout.mobilegateway.user.infrastructure;

import com.blockout.mobilegateway.shared.application.models.EntityType;
import com.blockout.mobilegateway.user.api.models.UpdateUserRequest;
import com.blockout.mobilegateway.user.api.models.UserFavoriteResponse;
import com.blockout.mobilegateway.user.api.models.UserResponse;
import com.blockout.mobilegateway.user.infrastructure.contract.models.UpdateUserInternalRequest;
import com.blockout.mobilegateway.user.infrastructure.contract.models.UserInternalResponse;
import org.springframework.stereotype.Component;

/**
 * Maps generated internal User contracts at the gateway adapter boundary.
 */
@Component
public class UserContractMapper {

    /**
     * Converts the public update input to the generated internal request.
     */
    public UpdateUserInternalRequest toInternalRequest(UpdateUserRequest request) {
        return new UpdateUserInternalRequest()
            .pseudo(request.getPseudo())
            .pictureUrl(request.getPictureUrl());
    }

    /**
     * Converts an internal User response to the existing public gateway response.
     */
    public UserResponse toResponse(UserInternalResponse user) {
        if (user == null) {
            return null;
        }
        return UserResponse.builder()
            .id(user.getId())
            .auth0Id(user.getAuth0Id())
            .email(user.getEmail())
            .pseudo(user.getPseudo())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .pictureUrl(user.getPictureUrl())
            .phoneNumber(user.getPhoneNumber())
            .active(user.getActive())
            .createdAt(user.getCreatedAt())
            .lastUpdate(user.getLastUpdate())
            .favorites(user.getFavorites() == null ? null : user.getFavorites().stream()
                .map(favorite -> UserFavoriteResponse.builder()
                    .entityType(EntityType.valueOf(favorite.getEntityType().name()))
                    .entityId(favorite.getEntityId())
                    .build())
                .toList())
            .build();
    }
}
