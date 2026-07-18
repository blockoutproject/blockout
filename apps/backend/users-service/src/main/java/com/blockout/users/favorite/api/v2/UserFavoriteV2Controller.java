package com.blockout.users.favorite.api.v2;

import com.blockout.shared.model.EntityTypeEnum;
import com.blockout.users.favorite.api.mappers.FavoriteApiMapper;
import com.blockout.users.favorite.application.FavoriteCommand;
import com.blockout.users.favorite.application.FavoriteService;
import com.blockout.users.generated.api.UserFavoritesApi;
import com.blockout.users.generated.model.UserFavoritePageResponse;
import com.blockout.users.shared.security.AuthenticatedUserSubject;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

/** Implements canonical generated v2 favorite reads and mutations. */
@RestController
@RequiredArgsConstructor
public class UserFavoriteV2Controller implements UserFavoritesApi {

    private final FavoriteService favorites;
    private final FavoriteApiMapper mapper;
    private final AuthenticatedUserSubject authenticatedSubject;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<UserFavoritePageResponse> listUserFavorites(
            Long userId, EntityTypeEnum entityType, Integer page, Integer pageSize) {
        return ResponseEntity.ok(mapper.toResponse(
                favorites.listPage(userId, entityType, page, pageSize)));
    }

    /** {@inheritDoc} */
    @Override
    @PreAuthorize("""
                (#entityType.name() == 'TEAM' and hasAuthority('SCOPE_follow:teams')) or
                (#entityType.name() == 'POOL' and hasAuthority('SCOPE_follow:pools'))
            """)
    public ResponseEntity<Void> followEntity(EntityTypeEnum entityType, Long entityId) {
        favorites.follow(new FavoriteCommand(
                authenticatedSubject.get(), entityType, entityId));
        return ResponseEntity.noContent().build();
    }

    /** {@inheritDoc} */
    @Override
    @PreAuthorize("""
                (#entityType.name() == 'TEAM' and hasAuthority('SCOPE_follow:teams')) or
                (#entityType.name() == 'POOL' and hasAuthority('SCOPE_follow:pools'))
            """)
    public ResponseEntity<Void> unfollowEntity(EntityTypeEnum entityType, Long entityId) {
        favorites.unfollow(new FavoriteCommand(
                authenticatedSubject.get(), entityType, entityId));
        return ResponseEntity.noContent().build();
    }
}
