package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.user.CustomUserDTO;
import com.blockout.mobilegateway.models.dto.user.CustomUserUpdateDTO;
import com.blockout.mobilegateway.services.UserService;
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

    private final UserService userService;
    private final ObjectMapper objectMapper;

    @PutMapping(path = "/users/{auth0Id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomUserDTO> updateUser(
            @PathVariable String auth0Id,
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        CustomUserUpdateDTO dto = objectMapper.readValue(json, CustomUserUpdateDTO.class);
        CustomUserDTO updated = userService.updateUser(auth0Id, dto, image);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/users/me")
    public ResponseEntity<CustomUserDTO> ensureCurrentUser() {
        CustomUserDTO user = userService.ensureCurrentUser();
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