package com.blockout.users.user.api;

import com.blockout.users.user.api.mappers.UserApiMapper;
import com.blockout.users.user.api.models.UpdateUserInternalRequest;
import com.blockout.users.user.api.models.UserInternalResponse;
import com.blockout.users.user.application.UserService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/** Exposes the handwritten V1 User API. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final UserApiMapper mapper;
    private final ObjectMapper objectMapper;

    @PreAuthorize("hasAuthority('SCOPE_read:users')")
    @GetMapping("/{auth0Id}")
    public ResponseEntity<UserInternalResponse> getUserByAuth0Id(@PathVariable String auth0Id) {
        return ResponseEntity.ok(mapper.toInternalResponse(userService.getUserByAuth0Id(auth0Id)));
    }

    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    @GetMapping("/me")
    public ResponseEntity<UserInternalResponse> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(mapper.toInternalResponse(userService.getUserByAuth0Id(jwt.getSubject())));
    }

    @PreAuthorize("hasAuthority('SCOPE_update:current_user')")
    @PutMapping(path = "/{auth0Id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserInternalResponse> updateUser(
            @PathVariable String auth0Id,
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image)
            throws JsonProcessingException, IOException {
        UpdateUserInternalRequest request = objectMapper.readValue(json, UpdateUserInternalRequest.class);
        return ResponseEntity.ok(mapper.toInternalResponse(
                userService.updateUser(auth0Id, mapper.toCommand(request, image))));
    }

    @PreAuthorize("hasAuthority('SCOPE_create:current_user')")
    @PutMapping("/me")
    public ResponseEntity<UserInternalResponse> ensureCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(mapper.toInternalResponse(userService.ensureCurrentUser(jwt.getSubject())));
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:current_user')")
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteUser(@AuthenticationPrincipal Jwt jwt) {
        userService.deleteUser(jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/internal/{auth0Id}/assign-default-role")
    public ResponseEntity<Void> assignDefaultRole(@PathVariable String auth0Id) {
        userService.assignDefaultRole(auth0Id);
        return ResponseEntity.noContent().build();
    }
}
