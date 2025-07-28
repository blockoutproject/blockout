package com.blockout.users.controllers.v1;

import com.auth0.exception.Auth0Exception;
import com.blockout.users.models.CustomUser;
import com.blockout.users.models.dto.CustomUserDto;
import com.blockout.users.models.dto.UserRegistrationRequestDTO;
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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

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
    @GetMapping("/{auth0Id}")
    public ResponseEntity<CustomUserDto> getUserByAuth0Id(@PathVariable String auth0Id) {
        CustomUserDto user = userService.getUserByAuth0Id(auth0Id);
        return ResponseEntity.ok(user);
    }

    @Operation(summary = "Enregistrer un utilisateur", description = "Crée un nouvel utilisateur à partir du token Auth0.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Utilisateur créé"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PreAuthorize("hasAuthority('SCOPE_create:users')")
    @PostMapping
    public ResponseEntity<CustomUser> registerUser(
            @RequestBody UserRegistrationRequestDTO body,
            @AuthenticationPrincipal Jwt jwt) throws Auth0Exception {

        String auth0Id = jwt.getSubject();
        CustomUser created = userService.registerUser(auth0Id, body);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
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