package com.blockout.mobilegateway.user.api.mappers;

import com.blockout.mobilegateway.api.models.UpdateUserRequest;
import com.blockout.mobilegateway.api.models.UserFavoriteResponse;
import com.blockout.mobilegateway.api.models.UserResponse;
import com.blockout.mobilegateway.user.application.commands.UpdateUserCommand;
import com.blockout.mobilegateway.user.application.views.UserFavoriteView;
import com.blockout.mobilegateway.user.application.views.UserView;
import com.blockout.shared.model.EntityTypeEnum;
import org.springframework.stereotype.Component;

/** Maps User application data to the generated mobile API contract. */
@Component
public class UserApiMapper {

    /**
     * Maps a public user update request to the application command.
     *
     * @param source generated public request.
     * @return application update command.
     */
    public UpdateUserCommand toCommand(UpdateUserRequest source) {
        return new UpdateUserCommand(source.getPseudo(), source.getPictureUrl());
    }

    /**
     * Maps an application user view to the public response.
     *
     * @param source application user view.
     * @return generated public response.
     */
    public UserResponse toResponse(UserView source) {
        return new UserResponse(
            source.id(), source.auth0Id(), source.email(), source.pseudo(), source.active(),
            source.createdAt(), source.lastUpdate())
            .firstName(source.firstName())
            .lastName(source.lastName())
            .pictureUrl(source.pictureUrl())
            .phoneNumber(source.phoneNumber())
            .favorites(source.favorites() == null
                ? null
                : source.favorites().stream().map(this::toResponse).toList());
    }

    /**
     * Maps one favorite for nested user response conversion.
     *
     * @param source application favorite view.
     * @return generated favorite response.
     */
    private UserFavoriteResponse toResponse(
            UserFavoriteView source) {
        return new UserFavoriteResponse(
            EntityTypeEnum.valueOf(source.entityType().name()), source.entityId());
    }
}
