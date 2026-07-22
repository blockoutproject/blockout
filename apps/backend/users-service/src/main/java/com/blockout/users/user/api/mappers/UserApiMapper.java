package com.blockout.users.user.api.mappers;

import com.blockout.users.user.api.models.UpdateUserInternalRequest;
import com.blockout.users.user.api.models.UserFavoriteInternalResponse;
import com.blockout.users.user.api.models.UserFavoriteSummaryInternalResponse;
import com.blockout.users.user.api.models.UserInternalResponse;
import com.blockout.users.user.application.commands.UpdateUserCommand;
import com.blockout.users.user.application.commands.UserImageCommand;
import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.application.views.UserFavoriteView;
import com.blockout.users.user.application.views.UserView;
import com.blockout.shared.model.EntityTypeEnum;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Maps between generated User transport models and application-owned models.
 */
@Component
public class UserApiMapper {

    public UpdateUserCommand toCommand(UpdateUserInternalRequest request, MultipartFile image) {
        return new UpdateUserCommand(request.getPseudo(), request.getPictureUrl(), toImageCommand(image));
    }

    public UserInternalResponse toInternalResponse(UserView view) {
        return new UserInternalResponse(view.id(), view.auth0Id(), view.active())
            .email(view.email())
            .pseudo(view.pseudo())
            .firstName(view.firstName())
            .lastName(view.lastName())
            .pictureUrl(view.pictureUrl())
            .phoneNumber(view.phoneNumber())
            .createdAt(view.createdAt())
            .lastUpdate(view.lastUpdate())
            .favorites(view.favorites() == null ? null : view.favorites().stream()
                .map(favorite -> new UserFavoriteSummaryInternalResponse(
                    toContractEntityType(favorite.entityType()), favorite.entityId()))
                .toList());
    }

    public UserFavoriteInternalResponse toInternalResponse(UserFavoriteView view) {
        return new UserFavoriteInternalResponse(
            view.id(), toContractEntityType(view.entityType()), view.entityId(), view.createdAt());
    }

    public EntityType toApplicationEntityType(EntityTypeEnum entityType) {
        return entityType == null ? null : EntityType.valueOf(entityType.name());
    }

    private EntityTypeEnum toContractEntityType(EntityType entityType) {
        return EntityTypeEnum.valueOf(entityType.name());
    }

    private UserImageCommand toImageCommand(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return null;
        }
        try {
            return new UserImageCommand(image.getBytes(), image.getOriginalFilename(), image.getContentType());
        } catch (IOException exception) {
            throw new IllegalArgumentException("The uploaded image cannot be read.", exception);
        }
    }
}
