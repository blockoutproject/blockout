package com.blockout.users.user.api;

import com.blockout.users.user.api.mappers.UserApiMapper;
import com.blockout.users.user.api.models.UserFavoriteInternalResponse;
import com.blockout.users.user.application.UserFavoriteService;
import com.blockout.users.user.application.models.EntityType;
import com.blockout.shared.model.EntityTypeEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Implements the generated V1 internal User favorite API.
 */
@RestController
@RequiredArgsConstructor
public class UserFavoriteController implements UserFavoriteApi {

    private final UserFavoriteService favoriteService;
    private final UserApiMapper mapper;

    @Override
    public ResponseEntity<List<UserFavoriteInternalResponse>> listFavorites(
        Long userId,
        EntityTypeEnum entityType) {
        EntityType applicationEntityType = mapper.toApplicationEntityType(entityType);
        var favorites = applicationEntityType == null
            ? favoriteService.getUserFavorites(userId)
            : favoriteService.getUserFavoritesByType(userId, applicationEntityType);
        return ResponseEntity.ok(favorites.stream().map(mapper::toInternalResponse).toList());
    }

    @Override
    @PreAuthorize("""
        (#entityType.name() == 'TEAM' and hasAuthority('SCOPE_follow:teams')) or
        (#entityType.name() == 'POOL' and hasAuthority('SCOPE_follow:pools'))
        """)
    public ResponseEntity<Void> follow(
        EntityTypeEnum entityType,
        Long entityId) {
        favoriteService.follow(currentSubject(), mapper.toApplicationEntityType(entityType), entityId);
        return ResponseEntity.noContent().build();
    }

    @Override
    @PreAuthorize("""
        (#entityType.name() == 'TEAM' and hasAuthority('SCOPE_follow:teams')) or
        (#entityType.name() == 'POOL' and hasAuthority('SCOPE_follow:pools'))
        """)
    public ResponseEntity<Void> unfollow(
        EntityTypeEnum entityType,
        Long entityId) {
        favoriteService.unfollow(currentSubject(), mapper.toApplicationEntityType(entityType), entityId);
        return ResponseEntity.noContent().build();
    }

    private String currentSubject() {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return jwt.getSubject();
    }
}
