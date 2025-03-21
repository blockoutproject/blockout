package com.blockout.users.controllers;

import com.blockout.users.models.User;
import com.blockout.users.services.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Optional;

@RestController
@RequestMapping("/users/v1")
public class UserController {

    @Autowired
    private UserService userService;
    
    @Operation(summary = "Récupérer un utilisateur par ID Auth0", description = "Retourne un utilisateur spécifique en fonction de l'ID Auth0 fourni.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Utilisateur trouvé"),
            @ApiResponse(responseCode = "404", description = "Utilisateur non trouvé")
    })
    @GetMapping("/users/auth0/{auth0Id}")
    public ResponseEntity<User> getUserByAuth0Id(
            @Parameter(description = "ID Auth0 de l'utilisateur") @PathVariable String auth0Id) {
        
        Optional<User> user = userService.getUserByAuth0Id(auth0Id);
        
        if (user.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(user.get());
    }
    
    @Operation(summary = "Enregistrer un nouvel utilisateur", description = "Crée un nouvel utilisateur avec les informations fournies.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Utilisateur créé avec succès"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PostMapping("/users")
    public ResponseEntity<User> registerUser(@RequestBody User user) {
        User createdUser = userService.registerUser(user);
        
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(createdUser.getId())
                .toUri();
                
        return ResponseEntity.created(location).body(createdUser);
    }
}
