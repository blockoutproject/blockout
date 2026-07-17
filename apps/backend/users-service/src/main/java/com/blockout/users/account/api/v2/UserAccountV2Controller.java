package com.blockout.users.account.api.v2;

import com.blockout.users.account.api.UserProfileImageUploads;
import com.blockout.users.account.application.UserAccountService;
import com.blockout.users.account.application.UserProfileImageChange;
import com.blockout.users.account.application.UserProfileImageUpload;
import com.blockout.users.generated.api.UserAccountsApi;
import com.blockout.users.generated.model.UpdateUserProfileInternalRequest;
import com.blockout.users.generated.model.UserAccountInternalResponse;
import com.blockout.users.shared.security.AuthenticatedUserSubject;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Implements canonical v2 account/profile operations through application-owned contracts. */
@RestController
@RequiredArgsConstructor
public class UserAccountV2Controller implements UserAccountsApi {

    private final UserAccountService accounts;
    private final UserAccountApiMapper mapper;
    private final AuthenticatedUserSubject authenticatedSubject;

    /** {@inheritDoc} */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:users')")
    public ResponseEntity<UserAccountInternalResponse> getUserByAuth0Id(String auth0Id) {
        return ResponseEntity.ok(mapper.toResponse(accounts.getByAuth0Id(auth0Id)));
    }

    /** {@inheritDoc} */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:current_user')")
    public ResponseEntity<UserAccountInternalResponse> getCurrentUser() {
        return ResponseEntity.ok(mapper.toResponse(accounts.getByAuth0Id(authenticatedSubject.get())));
    }

    /** {@inheritDoc} */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:current_user')")
    public ResponseEntity<UserAccountInternalResponse> updateUserByAuth0Id(
            String auth0Id,
            UpdateUserProfileInternalRequest data,
            MultipartFile image) {
        UserProfileImageUpload upload = UserProfileImageUploads.from(image);
        if (Boolean.TRUE.equals(data.getRemovePicture()) && upload != null) {
            throw new IllegalArgumentException("removePicture cannot be true when an image is supplied.");
        }
        UserProfileImageChange change = upload != null
                ? UserProfileImageChange.replace(upload)
                : Boolean.TRUE.equals(data.getRemovePicture())
                        ? UserProfileImageChange.remove()
                        : UserProfileImageChange.keep();
        return ResponseEntity.ok(mapper.toResponse(
                accounts.updateByAuth0Id(auth0Id, mapper.toCommand(data, change))));
    }

    /** {@inheritDoc} */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:current_user')")
    public ResponseEntity<UserAccountInternalResponse> ensureCurrentUser() {
        return ResponseEntity.ok(mapper.toResponse(accounts.ensureCurrent(authenticatedSubject.get())));
    }

    /** {@inheritDoc} */
    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:current_user')")
    public ResponseEntity<Void> deleteCurrentUser() {
        accounts.deleteCurrent(authenticatedSubject.get());
        return ResponseEntity.noContent().build();
    }
}
