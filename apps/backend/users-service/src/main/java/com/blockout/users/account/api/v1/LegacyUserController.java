package com.blockout.users.account.api.v1;

import com.auth0.exception.Auth0Exception;
import com.blockout.users.account.api.UserProfileImageUploads;
import com.blockout.users.account.application.UpdateUserProfileCommand;
import com.blockout.users.account.application.UserAccountService;
import com.blockout.users.account.application.UserAccountView;
import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.users.account.application.UserProfileImageChange;
import com.blockout.users.account.application.UserProfileImageUpload;
import com.blockout.users.models.enums.EntityType;
import com.blockout.users.services.UserService;
import com.blockout.users.shared.api.v1.LegacyUsersJson;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
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

/** Preserves the deployed users v1 transport while delegating to shared account use cases. */
@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/users", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyUserController {

    private final UserAccountService accounts;
    private final UserService legacyIdentityOrchestration;
    private final LegacyUsersJson json;

    /** Returns the retained complete account response with reduced favorites by Auth0 identity. */
    @GetMapping("/{auth0Id}")
    @PreAuthorize("hasAuthority('SCOPE_read:users')")
    public ResponseEntity<String> getUserByAuth0Id(@PathVariable String auth0Id) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(readResponse(accounts.getByAuth0Id(auth0Id))));
    }

    /** Returns the retained complete current-account response with reduced favorites. */
    @GetMapping("/me")
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<String> getCurrentUser(@AuthenticationPrincipal Jwt jwt) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(readResponse(accounts.getByAuth0Id(jwt.getSubject()))));
    }

    /** Preserves the legacy picture URL echo/null protocol while using explicit application intent. */
    @PutMapping(path = "/{auth0Id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('SCOPE_update:current_user')")
    public ResponseEntity<String> updateUser(
            @PathVariable String auth0Id,
            @RequestPart("data") String body,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {
        LegacyUpdateUserRequest request = json.read(body, LegacyUpdateUserRequest.class);
        UserProfileImageUpload upload = UserProfileImageUploads.from(image);
        UserProfileImageChange imageChange = upload != null
                ? UserProfileImageChange.replace(upload)
                : request.pictureUrl() == null
                        ? UserProfileImageChange.remove()
                        : UserProfileImageChange.keep();
        UserAccountView updated = accounts.updateByAuth0Id(
                auth0Id, new UpdateUserProfileCommand(request.pseudo(), imageChange));
        return ResponseEntity.ok(json.write(entityResponse(updated)));
    }

    /** Creates or synchronizes the current account with the retained Auth0 behavior. */
    @PutMapping("/me")
    @PreAuthorize("hasAuthority('SCOPE_create:current_user')")
    public ResponseEntity<String> ensureCurrentUser(@AuthenticationPrincipal Jwt jwt)
            throws Auth0Exception, JsonProcessingException {
        return ResponseEntity.ok(json.write(entityResponse(accounts.ensureCurrent(jwt.getSubject()))));
    }

    /** Deletes the current account with the retained Auth0-first ordering. */
    @DeleteMapping("/me")
    @PreAuthorize("hasAuthority('SCOPE_delete:current_user')")
    public ResponseEntity<Void> deleteUser(@AuthenticationPrincipal Jwt jwt) throws Auth0Exception {
        accounts.deleteCurrent(jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    /** Preserves the v1 API-key-protected default-role operation for MRG-364. */
    @PostMapping("/internal/{auth0Id}/assign-default-role")
    public ResponseEntity<Void> assignDefaultRole(@PathVariable String auth0Id) {
        legacyIdentityOrchestration.assignDefaultRole(auth0Id);
        return ResponseEntity.noContent().build();
    }

    /** Maps the shared application view to the complete legacy account response. */
    private LegacyUserReadResponse readResponse(UserAccountView view) {
        List<LegacyUserFavoriteResponse> favorites = view.favorites() == null
                ? null
                : view.favorites().stream().map(this::favoriteResponse).toList();
        return new LegacyUserReadResponse(
                view.id(), view.auth0Id(), view.email(), view.pseudo(), view.firstName(), view.lastName(),
                view.pictureUrl(), view.phoneNumber(), view.active(), view.createdAt(), view.lastUpdate(), favorites);
    }

    /** Maps one application favorite to the legacy response shape. */
    private LegacyUserFavoriteResponse favoriteResponse(FavoriteView favorite) {
        return new LegacyUserFavoriteResponse(favorite.entityType(), favorite.entityId());
    }

    /** Preserves the historical entity-shaped response for v1 update and ensure operations. */
    private LegacyUserEntityResponse entityResponse(UserAccountView view) {
        List<LegacyUserFavoriteEntityResponse> favorites = view.favorites() == null
                ? null
                : view.favorites().stream()
                        .map(favorite -> new LegacyUserFavoriteEntityResponse(
                                favorite.id(), favorite.entityType(), favorite.entityId(), favorite.createdAt()))
                        .toList();
        return new LegacyUserEntityResponse(
                view.id(), view.auth0Id(), view.email(), view.pseudo(), view.firstName(), view.lastName(),
                view.pictureUrl(), view.phoneNumber(), favorites, view.active(), view.createdAt(), view.lastUpdate());
    }

    /** Carries the deployed legacy multipart profile fields. */
    record LegacyUpdateUserRequest(String pseudo, String pictureUrl) {
    }

    /** Carries the deployed complete legacy account response. */
    record LegacyUserReadResponse(
            Long id,
            String auth0Id,
            String email,
            String pseudo,
            String firstName,
            String lastName,
            String pictureUrl,
            String phoneNumber,
            Boolean active,
            Instant createdAt,
            Instant lastUpdate,
            List<LegacyUserFavoriteResponse> favorites) {
    }

    /** Carries one favorite in the deployed legacy account response. */
    record LegacyUserFavoriteResponse(EntityType entityType, Long entityId) {
    }

    /** Carries the historical entity-shaped update and ensure response. */
    record LegacyUserEntityResponse(
            Long id,
            String auth0Id,
            String email,
            String pseudo,
            String firstName,
            String lastName,
            String pictureUrl,
            String phoneNumber,
            List<LegacyUserFavoriteEntityResponse> favorites,
            Boolean active,
            Instant createdAt,
            Instant lastUpdate) {
    }

    /** Carries the historical entity-shaped favorite fields. */
    record LegacyUserFavoriteEntityResponse(
            Long id,
            EntityType entityType,
            Long entityId,
            LocalDateTime createdAt) {
    }
}
