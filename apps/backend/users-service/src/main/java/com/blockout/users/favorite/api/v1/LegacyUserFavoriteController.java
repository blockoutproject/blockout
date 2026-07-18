package com.blockout.users.favorite.api.v1;

import com.blockout.users.favorite.application.FavoriteCommand;
import com.blockout.users.favorite.application.FavoriteService;
import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.shared.model.EntityTypeEnum;
import com.blockout.users.shared.api.v1.LegacyUsersJson;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Preserves the deployed v1 favorite transport over shared application use cases. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class LegacyUserFavoriteController {

    private final FavoriteService favorites;
    private final LegacyUsersJson json;

    /** Returns the retained unpaged entity-shaped snake_case array. */
    @GetMapping(value = "/{userId}/favorites", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> listFavorites(
            @PathVariable Long userId,
            @RequestParam(required = false, name = "entity_type") EntityTypeEnum entityType)
            throws JsonProcessingException {
        List<LegacyFavoriteResponse> result = favorites.listUnpaged(userId, entityType).stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(json.write(result));
    }

    /** Preserves scope selection, Auth0 subject resolution, and idempotent 204 behavior. */
    @PostMapping("/favorites/follow")
    @PreAuthorize("""
                (#entityType.name() == 'TEAM' and hasAuthority('SCOPE_follow:teams')) or
                (#entityType.name() == 'POOL' and hasAuthority('SCOPE_follow:pools'))
            """)
    public ResponseEntity<Void> follow(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "entity_type") EntityTypeEnum entityType,
            @RequestParam(name = "entity_id") Long entityId) {
        favorites.follow(new FavoriteCommand(jwt.getSubject(), entityType, entityId));
        return ResponseEntity.noContent().build();
    }

    /** Preserves scope selection, Auth0 subject resolution, and idempotent 204 behavior. */
    @DeleteMapping("/favorites/follow")
    @PreAuthorize("""
                (#entityType.name() == 'TEAM' and hasAuthority('SCOPE_follow:teams')) or
                (#entityType.name() == 'POOL' and hasAuthority('SCOPE_follow:pools'))
            """)
    public ResponseEntity<Void> unfollow(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "entity_type") EntityTypeEnum entityType,
            @RequestParam(name = "entity_id") Long entityId) {
        favorites.unfollow(new FavoriteCommand(jwt.getSubject(), entityType, entityId));
        return ResponseEntity.noContent().build();
    }

    /** Projects only the fields historically emitted from the JPA entity. */
    private LegacyFavoriteResponse toResponse(FavoriteView favorite) {
        return new LegacyFavoriteResponse(
                favorite.id(), favorite.entityType(), favorite.entityId(), favorite.createdAt());
    }

    /** Carries the exact v1 favorite-list wire fields without exposing persistence entities. */
    record LegacyFavoriteResponse(Long id, EntityTypeEnum entityType, Long entityId, LocalDateTime createdAt) {
    }
}
