package com.blockout.mobilegateway.user.infrastructure;

import com.blockout.mobilegateway.shared.application.models.EntityType;
import com.blockout.mobilegateway.user.application.commands.UpdateUserCommand;
import com.blockout.mobilegateway.user.application.views.UserFavoriteView;
import com.blockout.mobilegateway.user.application.views.UserView;
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
    public UpdateUserInternalRequest toInternalRequest(UpdateUserCommand command) {
        return new UpdateUserInternalRequest()
            .pseudo(command.pseudo())
            .pictureUrl(command.pictureUrl());
    }

    /**
     * Converts an internal User response to an application view.
     */
    public UserView toResponse(UserInternalResponse user) {
        if (user == null) {
            return null;
        }
        return new UserView(
            user.getId(), user.getAuth0Id(), user.getEmail(), user.getPseudo(), user.getFirstName(),
            user.getLastName(), user.getPictureUrl(), user.getPhoneNumber(), user.getActive(), user.getCreatedAt(),
            user.getLastUpdate(), user.getFavorites() == null ? null : user.getFavorites().stream()
                .map(favorite -> new UserFavoriteView(
                    EntityType.valueOf(favorite.getEntityType().name()), favorite.getEntityId()))
                .toList());
    }
}
