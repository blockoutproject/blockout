package com.blockout.users.controllers.v1;

import com.auth0.exception.Auth0Exception;
import com.blockout.users.models.CustomUser;
import com.blockout.users.models.dto.CustomUserDto;
import com.blockout.users.services.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Récupérer un utilisateur", description = "Récupère un utilisateur à partir de son ID Auth0.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Utilisateur trouvé"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @PreAuthorize("hasAuthority('SCOPE_read:users') or hasAuthority('SCOPE_read:current_user')")
    @GetMapping("/{auth0Id}")
    public ResponseEntity<CustomUserDto> getUserByAuth0Id(@PathVariable String auth0Id) {
        CustomUserDto user = userService.getUserByAuth0Id(auth0Id);
        return ResponseEntity.ok(user);
    }

    @Operation(summary = "Créer ou mettre à jour l'utilisateur courant", description = "Crée l'utilisateur s'il n'existe pas encore, ou met à jour ses données depuis Auth0 si nécessaire.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Utilisateur existant ou mis à jour avec succès"),
            @ApiResponse(responseCode = "500", description = "Erreur lors de la récupération depuis Auth0")
    })
    @PreAuthorize("hasAuthority('SCOPE_user:ensure')")
    @PutMapping("/me")
    public ResponseEntity<CustomUser> ensureCurrentUser(@AuthenticationPrincipal Jwt jwt) throws Auth0Exception {
        String auth0Id = jwt.getSubject();
        CustomUser user = userService.ensureCurrentUser(auth0Id);
        return ResponseEntity.ok(user);
    }

    @Operation(summary = "Supprimer un utilisateur", description = "Supprime un utilisateur dans Auth0 et en base de données.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Utilisateur supprimé"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé"),
            @ApiResponse(responseCode = "500", description = "Erreur serveur lors de la suppression")
    })
    @PreAuthorize("hasAuthority('SCOPE_delete:current_user') or hasAuthority('SCOPE_delete:users')")
    @DeleteMapping
    public ResponseEntity<Void> deleteUser(@AuthenticationPrincipal Jwt jwt) throws Auth0Exception {
        String auth0Id = jwt.getSubject();
        userService.deleteUser(auth0Id);
        return ResponseEntity.noContent().build();
    }
}