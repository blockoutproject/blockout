package com.blockout.users.user.api;

import com.blockout.users.user.api.mappers.UserApiMapper;
import com.blockout.users.user.api.models.UserFavoriteInternalResponse;
import com.blockout.users.user.application.UserFavoriteService;
import com.blockout.users.user.application.models.EntityType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserFavoriteController {

    private final UserFavoriteService favoriteService;
    private final UserApiMapper mapper;

    @GetMapping("/{userId}/favorites")
    public ResponseEntity<List<UserFavoriteInternalResponse>> listFavorites(
        @PathVariable Long userId,
        @RequestParam(required = false) EntityType entityType) {
        var favorites = entityType == null
            ? favoriteService.getUserFavorites(userId)
            : favoriteService.getUserFavoritesByType(userId, entityType);
        return ResponseEntity.ok(favorites.stream().map(mapper::toInternalResponse).toList());
    }

    @PreAuthorize("""
        (#entityType.name() == 'TEAM' and hasAuthority('SCOPE_follow:teams')) or
        (#entityType.name() == 'POOL' and hasAuthority('SCOPE_follow:pools'))
        """)
    @PostMapping("/favorites/follow")
    public ResponseEntity<Void> follow(
        @AuthenticationPrincipal Jwt jwt,
        @RequestParam EntityType entityType,
        @RequestParam Long entityId) {
        favoriteService.follow(jwt.getSubject(), entityType, entityId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("""
        (#entityType.name() == 'TEAM' and hasAuthority('SCOPE_follow:teams')) or
        (#entityType.name() == 'POOL' and hasAuthority('SCOPE_follow:pools'))
        """)
    @DeleteMapping("/favorites/follow")
    public ResponseEntity<Void> unfollow(
        @AuthenticationPrincipal Jwt jwt,
        @RequestParam EntityType entityType,
        @RequestParam Long entityId) {
        favoriteService.unfollow(jwt.getSubject(), entityType, entityId);
        return ResponseEntity.noContent().build();
    }
}
