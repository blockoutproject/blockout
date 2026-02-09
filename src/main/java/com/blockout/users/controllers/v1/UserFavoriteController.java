package com.blockout.users.controllers.v1;

import com.blockout.users.models.entities.UserFavorite;
import com.blockout.users.models.enums.EntityType;
import com.blockout.users.services.UserFavoriteService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

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

    @Operation(summary = "Lister les favoris", description = "Retourne les entités suivies par un utilisateur.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Favoris retournés"),
            @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    })
    @GetMapping("/{userId}/favorites")
    public ResponseEntity<List<UserFavorite>> listFavorites(
            @PathVariable Long userId,
            @RequestParam(required = false, name = "entity_type") EntityType entityType) {

        List<UserFavorite> list = entityType == null
                ? favoriteService.getUserFavorites(userId)
                : favoriteService.getUserFavoritesByType(userId, entityType);

        return ResponseEntity.ok(list);
    }

    @Operation(summary = "Suivre une entité", description = "Ajoute une entité aux favoris de l'utilisateur.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Suivi effectué"),
            @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    })
    //TODOZ @PreAuthorize("""
                //TODOZ (#entityType.name() == 'TEAM' and hasAuthority('SCOPE_follow:teams')) or
               //TODOZ  (#entityType.name() == 'POOL' and hasAuthority('SCOPE_follow:pools'))
         //TODOZ    """)
    @PostMapping("/favorites/follow")
    public ResponseEntity<Void> follow(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "entity_type") EntityType entityType,
            @RequestParam(name = "entity_id") Long entityId) {

        favoriteService.follow(jwt.getSubject(), entityType, entityId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Ne plus suivre une entité", description = "Supprime une entité des favoris de l'utilisateur.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Suivi supprimé"),
            @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    })
    //TODOZ @PreAuthorize("""
                //TODOZ (#entityType.name() == 'TEAM' and hasAuthority('SCOPE_follow:teams')) or
                //TODOZ (#entityType.name() == 'POOL' and hasAuthority('SCOPE_follow:pools'))
            //TODOZ """)
    @DeleteMapping("/favorites/follow")
    public ResponseEntity<Void> unfollow(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "entity_type") EntityType entityType,
            @RequestParam(name = "entity_id") Long entityId) {

        favoriteService.unfollow(jwt.getSubject(), entityType, entityId);
        return ResponseEntity.noContent().build();
    }
}