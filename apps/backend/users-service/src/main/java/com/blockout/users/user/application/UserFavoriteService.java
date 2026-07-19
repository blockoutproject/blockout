package com.blockout.users.user.application;

import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.application.views.UserFavoriteView;

import java.util.List;

public interface UserFavoriteService {

    void follow(String auth0Id, EntityType entityType, Long entityId);

    void unfollow(String auth0Id, EntityType entityType, Long entityId);

    List<UserFavoriteView> getUserFavorites(Long userId);

    List<UserFavoriteView> getUserFavoritesByType(Long userId, EntityType entityType);
}
