package com.blockout.users.user.api;

import com.blockout.users.user.api.mappers.UserApiMapper;
import com.blockout.users.user.api.models.UpdateUserInternalRequest;
import com.blockout.users.user.api.models.UserInternalResponse;
import com.blockout.users.user.application.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/** Implements the generated V1 internal User API. */
@RestController
@RequiredArgsConstructor
public class UserController implements UserApi {

  private final UserService userService;
  private final UserApiMapper mapper;
  private final ObjectMapper objectMapper;

  @Override
  @PreAuthorize("hasAuthority('SCOPE_read:users')")
  public ResponseEntity<UserInternalResponse> getUserByAuth0Id(String auth0Id) {
    return ResponseEntity.ok(mapper.toInternalResponse(userService.getUserByAuth0Id(auth0Id)));
  }

  @Override
  @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
  public ResponseEntity<UserInternalResponse> getCurrentUser() {
    return ResponseEntity.ok(
        mapper.toInternalResponse(userService.getUserByAuth0Id(currentSubject())));
  }

  @Override
  @PreAuthorize("hasAuthority('SCOPE_update:current_user')")
  public ResponseEntity<UserInternalResponse> updateUser(
      String auth0Id, String data, MultipartFile image) {
    UpdateUserInternalRequest request = readData(data);
    return ResponseEntity.ok(
        mapper.toInternalResponse(
            userService.updateUser(currentSubject(), mapper.toCommand(request, image))));
  }

  @Override
  @PreAuthorize("hasAuthority('SCOPE_create:current_user')")
  public ResponseEntity<UserInternalResponse> ensureCurrentUser() {
    return ResponseEntity.ok(
        mapper.toInternalResponse(userService.ensureCurrentUser(currentSubject())));
  }

  @Override
  @PreAuthorize("hasAuthority('SCOPE_delete:current_user')")
  public ResponseEntity<Void> deleteUser() {
    userService.deleteUser(currentSubject());
    return ResponseEntity.noContent().build();
  }

  @Override
  public ResponseEntity<Void> assignDefaultRole(String auth0Id) {
    userService.assignDefaultRole(auth0Id);
    return ResponseEntity.noContent().build();
  }

  private String currentSubject() {
    Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    return jwt.getSubject();
  }

  private UpdateUserInternalRequest readData(String data) {
    try {
      return objectMapper.readValue(data, UpdateUserInternalRequest.class);
    } catch (JacksonException exception) {
      throw new IllegalArgumentException("The multipart data field is invalid.", exception);
    }
  }
}
