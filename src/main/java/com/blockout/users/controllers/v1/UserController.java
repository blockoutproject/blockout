package com.blockout.users.controllers.v1;

import com.auth0.exception.Auth0Exception;
import com.blockout.users.models.CustomUser;
import com.blockout.users.models.UserRegistrationRequest;
import com.blockout.users.models.dto.CustomUserDto;
import com.blockout.users.services.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Optional;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @Operation(summary = "Récupérer un utilisateur par ID Auth0", description = "Retourne un utilisateur spécifique en fonction de l'ID Auth0 fourni.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Utilisateur trouvé"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @GetMapping("/users/auth0/{auth0Id}")
    public ResponseEntity<CustomUserDto> getUserByAuth0Id(
            @Parameter(description = "ID Auth0 de l'utilisateur") @PathVariable String auth0Id) {

        Optional<CustomUserDto> user = userService.getUserByAuth0Id(auth0Id);

        if (user.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(user.get());
    }

    @Operation(summary = "Enregistrer un nouvel utilisateur", description = "Crée un nouvel utilisateur avec le pseudo, l'email, le firstName et le lastName fournis, en utilisant le 'sub' extrait de l'access token Auth0 pour sécuriser la création.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Utilisateur créé avec succès"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PostMapping("/users")
    public ResponseEntity<CustomUser> registerUser(@RequestBody UserRegistrationRequest registrationRequest,
            @AuthenticationPrincipal Jwt jwt) throws Auth0Exception {

        String auth0Id = jwt.getSubject();

        CustomUser createdUser = userService.registerUser(auth0Id, registrationRequest);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(createdUser.getId())
                .toUri();

        return ResponseEntity.created(location).body(createdUser);
    }
}
