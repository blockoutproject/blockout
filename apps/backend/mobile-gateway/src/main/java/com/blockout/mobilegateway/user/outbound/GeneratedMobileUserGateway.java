package com.blockout.mobilegateway.user.outbound;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.mobilegateway.shared.outbound.TemporaryFilePart;
import com.blockout.mobilegateway.user.application.MobileUserGateway;
import com.blockout.mobilegateway.user.application.MobileUserWorkflow;
import com.blockout.mobilegateway.usersclient.api.UserAccountsClient;
import com.blockout.mobilegateway.usersclient.api.UserFavoritesClient;
import com.blockout.mobilegateway.usersclient.model.UpdateUserProfileInternalRequest;
import com.blockout.mobilegateway.usersclient.model.UserAccountInternalResponse;
import com.blockout.shared.model.EntityTypeEnum;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Component;

@Component
public class GeneratedMobileUserGateway implements MobileUserGateway {

    private final UserAccountsClient accounts;
    private final UserFavoritesClient favorites;

    public GeneratedMobileUserGateway(UserAccountsClient accounts, UserFavoritesClient favorites) {
        this.accounts = accounts;
        this.favorites = favorites;
    }

    @Override
    public MobileUserWorkflow.UserView update(
            String auth0Id, MobileUserWorkflow.UpdateCommand command, BinaryPart image) {
        var request = new UpdateUserProfileInternalRequest()
                .pseudo(command.pseudo())
                .removePicture(command.removePicture());
        TemporaryFilePart temporary = TemporaryFilePart.create(image);
        try {
            return view(accounts.updateUserByAuth0Id(
                    auth0Id, request, temporary == null ? null : temporary.file()));
        } finally {
            if (temporary != null) {
                temporary.close();
            }
        }
    }

    @Override
    public MobileUserWorkflow.UserView ensureCurrent() {
        return view(accounts.ensureCurrentUser());
    }

    @Override
    public void deleteCurrent() {
        accounts.deleteCurrentUser();
    }

    @Override
    @Caching(evict = {
            @CacheEvict(value = "teamById", key = "#entityId", condition = "#entityType.name() == 'TEAM'"),
            @CacheEvict(value = "poolById", key = "#entityId", condition = "#entityType.name() == 'POOL'")
    })
    public void follow(EntityTypeEnum entityType, Long entityId) {
        favorites.followEntity(entityType, entityId);
    }

    @Override
    @Caching(evict = {
            @CacheEvict(value = "teamById", key = "#entityId", condition = "#entityType.name() == 'TEAM'"),
            @CacheEvict(value = "poolById", key = "#entityId", condition = "#entityType.name() == 'POOL'")
    })
    public void unfollow(EntityTypeEnum entityType, Long entityId) {
        favorites.unfollowEntity(entityType, entityId);
    }

    private MobileUserWorkflow.UserView view(UserAccountInternalResponse response) {
        var favoriteViews = response.getFavorites() == null
                ? java.util.List.<MobileUserWorkflow.FavoriteView>of()
                : response.getFavorites().stream()
                        .map(item -> new MobileUserWorkflow.FavoriteView(item.getEntityType(), item.getEntityId()))
                        .toList();
        return new MobileUserWorkflow.UserView(
                response.getId(), response.getAuth0Id(), response.getEmail(), response.getPseudo(),
                response.getPictureUrl(), favoriteViews);
    }
}
