package com.blockout.users.controllers.v1;

import com.auth0.exception.Auth0Exception;
import com.blockout.users.models.CustomUser;
import com.blockout.users.models.UserRegistrationRequest;
import com.blockout.users.models.dto.CustomUserDto;
import com.blockout.users.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
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
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @Operation(summary = "Get user by Auth0 ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User found"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{auth0Id}")
    public ResponseEntity<CustomUserDto> getUserByAuth0Id(@PathVariable String auth0Id) {
        Optional<CustomUserDto> user = userService.getUserByAuth0Id(auth0Id);
        return user.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Register user", description = "Registers a user based on Auth0 token subject.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User created"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping
    public ResponseEntity<CustomUser> registerUser(
            @RequestBody UserRegistrationRequest body,
            @AuthenticationPrincipal Jwt jwt) throws Auth0Exception {

        String auth0Id = jwt.getSubject();
        CustomUser created = userService.registerUser(auth0Id, body);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }
}