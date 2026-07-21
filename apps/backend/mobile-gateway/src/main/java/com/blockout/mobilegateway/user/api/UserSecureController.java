package com.blockout.mobilegateway.user.api;

import com.blockout.mobilegateway.user.api.models.UpdateUserRequest;
import com.blockout.mobilegateway.user.api.models.UserResponse;
import com.blockout.mobilegateway.user.application.UserApplicationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure")
public class UserSecureController {

    private final UserApplicationService userService;
    private final ObjectMapper objectMapper;

    @PutMapping(path = "/users/{auth0Id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> updateUser(
        @PathVariable String auth0Id,
        @RequestPart("data") String json,
        @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        UpdateUserRequest dto = objectMapper.readValue(json, UpdateUserRequest.class);
        UserResponse updated = userService.updateUser(auth0Id, dto, image);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/users/me")
    public ResponseEntity<UserResponse> ensureCurrentUser() {
        UserResponse user = userService.ensureCurrentUser();
        return ResponseEntity.ok(user);
    }

    @DeleteMapping("/users/me")
    public ResponseEntity<Void> deleteCurrentUser() {
        userService.deleteCurrentUser();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/favorites/follow")
    public ResponseEntity<Void> follow(
        @AuthenticationPrincipal Jwt jwt,
        @RequestParam(name = "entityType") String entityType,
        @RequestParam(name = "entityId") Long entityId) {

        userService.follow(jwt.getSubject(), entityType, entityId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/favorites/follow")
    public ResponseEntity<Void> unfollow(
        @AuthenticationPrincipal Jwt jwt,
        @RequestParam(name = "entityType") String entityType,
        @RequestParam(name = "entityId") Long entityId) {

        userService.unfollow(jwt.getSubject(), entityType, entityId);
        return ResponseEntity.noContent().build();
    }
}
