package com.blockout.mobilegateway.user.api;

import com.blockout.mobilegateway.api.UserSecureApi;
import com.blockout.mobilegateway.api.models.UpdateUserRequest;
import com.blockout.mobilegateway.api.models.UserResponse;
import com.blockout.mobilegateway.user.application.UserApplicationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Exposes secured User operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class UserSecureController implements UserSecureApi {

    private final UserApplicationService userService;
    private final UserApiMapper mapper;
    private final ObjectMapper objectMapper;

    @Override
    public ResponseEntity<UserResponse> updateUser(String auth0Id, String data, MultipartFile image) {
        try {
            UpdateUserRequest request = objectMapper.readValue(data, UpdateUserRequest.class);
            return ResponseEntity.ok(mapper.toResponse(
                userService.updateUser(auth0Id, mapper.toCommand(request), image)));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Invalid multipart JSON data", exception);
        }
    }

    @Override
    public ResponseEntity<UserResponse> ensureCurrentUser() {
        return ResponseEntity.ok(mapper.toResponse(userService.ensureCurrentUser()));
    }

    @Override
    public ResponseEntity<Void> deleteCurrentUser() {
        userService.deleteCurrentUser();
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> followFavorite(String entityType, Long entityId) {
        userService.follow(entityType, entityId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> unfollowFavorite(String entityType, Long entityId) {
        userService.unfollow(entityType, entityId);
        return ResponseEntity.noContent().build();
    }
}
