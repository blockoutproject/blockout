package com.blockout.mobilegateway.user.application;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.shared.model.EntityTypeEnum;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MobileUserWorkflow {

    private final MobileUserGateway gateway;

    public UserView update(String auth0Id, UpdateCommand command, BinaryPart image) {
        return gateway.update(auth0Id, command, image);
    }

    public UserView ensureCurrent() {
        return gateway.ensureCurrent();
    }

    public void deleteCurrent() {
        gateway.deleteCurrent();
    }

    public void follow(EntityTypeEnum entityType, Long entityId) {
        gateway.follow(entityType, entityId);
    }

    public void unfollow(EntityTypeEnum entityType, Long entityId) {
        gateway.unfollow(entityType, entityId);
    }

    public record UpdateCommand(String pseudo, boolean removePicture) {
    }

    public record FavoriteView(EntityTypeEnum entityType, Long entityId) {
    }

    public record UserView(
            Long id,
            String auth0Id,
            String email,
            String pseudo,
            URI pictureUrl,
            List<FavoriteView> favorites) {

        public UserView {
            favorites = favorites == null ? List.of() : List.copyOf(favorites);
        }
    }
}
