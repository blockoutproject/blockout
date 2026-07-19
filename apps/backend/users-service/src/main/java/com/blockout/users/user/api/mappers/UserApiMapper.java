package com.blockout.users.user.api.mappers;

import com.blockout.users.user.api.models.UpdateUserInternalRequest;
import com.blockout.users.user.api.models.UserFavoriteInternalResponse;
import com.blockout.users.user.api.models.UserFavoriteSummaryInternalResponse;
import com.blockout.users.user.api.models.UserInternalResponse;
import com.blockout.users.user.application.commands.UpdateUserCommand;
import com.blockout.users.user.application.commands.UserImageCommand;
import com.blockout.users.user.application.views.UserFavoriteView;
import com.blockout.users.user.application.views.UserView;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Component
public class UserApiMapper {

    public UpdateUserCommand toCommand(UpdateUserInternalRequest request, MultipartFile image) throws IOException {
        return new UpdateUserCommand(request.pseudo(), request.pictureUrl(), toImageCommand(image));
    }

    public UserInternalResponse toInternalResponse(UserView view) {
        return new UserInternalResponse(
                view.id(), view.auth0Id(), view.email(), view.pseudo(), view.firstName(), view.lastName(),
                view.pictureUrl(), view.phoneNumber(), view.active(), view.createdAt(), view.lastUpdate(),
                view.favorites() == null ? null : view.favorites().stream()
                        .map(favorite -> new UserFavoriteSummaryInternalResponse(
                                favorite.entityType(), favorite.entityId()))
                        .toList());
    }

    public UserFavoriteInternalResponse toInternalResponse(UserFavoriteView view) {
        return new UserFavoriteInternalResponse(view.id(), view.entityType(), view.entityId(), view.createdAt());
    }

    private UserImageCommand toImageCommand(MultipartFile image) throws IOException {
        if (image == null || image.isEmpty()) return null;
        return new UserImageCommand(image.getBytes(), image.getOriginalFilename(), image.getContentType());
    }
}
