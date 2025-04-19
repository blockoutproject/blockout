package com.blockout.users.controllers.v1;

import com.blockout.users.models.*;
import com.blockout.users.services.UserFavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserFavoriteController {

    private final UserFavoriteService userFavoriteService;

    public UserFavoriteController(UserFavoriteService userFavoriteService) {
        this.userFavoriteService = userFavoriteService;
    }

    @Operation(summary = "Récupérer tous les favoris d'un utilisateur")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste de favoris retournée"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @GetMapping("/{userId}/favorites")
    public ResponseEntity<List<UserFavorite>> getAllFavoritesOfUser(@PathVariable Long userId) {
        List<UserFavorite> favorites = userFavoriteService.getUserFavorites(userId);
        return ResponseEntity.ok(favorites);
    }

    @Operation(summary = "Récupérer les favoris d'un utilisateur par type d'entité")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste de favoris retournée"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @GetMapping("/{userId}/favorites/{entityType}")
    public ResponseEntity<List<UserFavorite>> getAllFavoritesOfUserByType(@PathVariable Long userId,
            @PathVariable EntityType entityType) {
        List<UserFavorite> favorites = userFavoriteService.getUserFavoritesByType(userId, entityType);
        return ResponseEntity.ok(favorites);
    }

    @Operation(summary = "Suivre une entité")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Follow créé ou déjà existant"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @PostMapping("/follows/{entityType}/{entityId}")
    public ResponseEntity<Void> follow(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable EntityType entityType,
            @PathVariable Long entityId) {

        String auth0Id = jwt.getSubject();
        userFavoriteService.follow(auth0Id, entityType, entityId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Ne plus suivre une entité")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Follow supprimé"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @DeleteMapping("/follows/{entityType}/{entityId}")
    public ResponseEntity<Void> unfollow(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable EntityType entityType,
            @PathVariable Long entityId) {

        String auth0Id = jwt.getSubject();
        userFavoriteService.unfollow(auth0Id, entityType, entityId);
        return ResponseEntity.noContent().build();
    }
}