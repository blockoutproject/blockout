package com.blockout.users.controllers.v1;

import com.auth0.exception.Auth0Exception;
import com.blockout.users.models.CustomUser;
import com.blockout.users.models.dto.CustomUserDto;
import com.blockout.users.models.dto.CustomUserUpdateDTO;
import com.blockout.users.services.UserService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final ObjectMapper objectMapper;

    @Operation(summary = "Récupérer un utilisateur", description = "Récupère un utilisateur à partir de son ID Auth0.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Utilisateur trouvé"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @PreAuthorize("hasAuthority('SCOPE_read:users')")
    @GetMapping("/{auth0Id}")
    public ResponseEntity<CustomUserDto> getUserByAuth0Id(@PathVariable String auth0Id) {
        CustomUserDto user = userService.getUserByAuth0Id(auth0Id);
        return ResponseEntity.ok(user);
    }

    @Operation(summary = "Mettre à jour un utilisateur", description = "Met à jour un utilisateur existant.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Utilisateur mis à jour"),
            @ApiResponse(responseCode = "404", description = "Utilisateur introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:currnt_user') or hasAuthority('SCOPE_update:users')")
    @PutMapping(path = "/{auth0Id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomUser> updateUser(
            @PathVariable String auth0Id,
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        CustomUserUpdateDTO dto = objectMapper.readValue(json, CustomUserUpdateDTO.class);
        CustomUser updated = userService.updateUser(auth0Id, dto, image);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Créer ou mettre à jour l'utilisateur courant", description = "Crée l'utilisateur s'il n'existe pas encore, ou met à jour ses données depuis Auth0 si nécessaire.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Utilisateur existant ou mis à jour avec succès"),
            @ApiResponse(responseCode = "500", description = "Erreur lors de la récupération depuis Auth0")
    })
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

    @Operation(summary = "Assigner un rôle par défaut", description = "Assigne un rôle par défaut à un utilisateur Auth0 s'il n'en a pas encore.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Rôle assigné avec succès"),
            @ApiResponse(responseCode = "401", description = "Clé API invalide ou manquante"),
            @ApiResponse(responseCode = "500", description = "Erreur serveur lors de l'assignation")
    })
    @PostMapping("/internal/{auth0Id}/assign-default-role")
    public ResponseEntity<Void> assignDefaultRole(@PathVariable String auth0Id) {
        userService.assignDefaultRole(auth0Id);
        return ResponseEntity.noContent().build();
    }
}