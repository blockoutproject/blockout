package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.user.CustomUserDto;
import com.blockout.mobilegateway.models.dto.user.CustomUserUpdateDTO;
import com.blockout.mobilegateway.services.UserService;
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

    private final UserService userService;

    @PutMapping(path = "/users/{auth0Id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomUserDto> updateUser(
            @PathVariable String auth0Id,
            @RequestPart("data") CustomUserUpdateDTO data,
            @RequestPart(value = "image", required = false) MultipartFile image) {

        CustomUserDto updated = userService.updateUser(auth0Id, data, image);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/users/me")
    public ResponseEntity<CustomUserDto> ensureCurrentUser() {
        CustomUserDto user = userService.ensureCurrentUser();
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
            @RequestParam(name = "entity_type") String entityType,
            @RequestParam(name = "entity_id") Long entityId) {

        userService.follow(jwt.getSubject(), entityType, entityId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/favorites/follow")
    public ResponseEntity<Void> unfollow(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "entity_type") String entityType,
            @RequestParam(name = "entity_id") Long entityId) {

        userService.unfollow(jwt.getSubject(), entityType, entityId);
        return ResponseEntity.noContent().build();
    }
}