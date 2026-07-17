package com.blockout.users.account.api.v2;

import com.blockout.users.account.application.UserIdentityService;
import com.blockout.users.generated.api.UserIdentityApi;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Implements the canonical generated internal identity-administration operation. */
@RestController
@RequiredArgsConstructor
public class UserIdentityV2Controller implements UserIdentityApi {

    private final UserIdentityService identities;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> assignDefaultUserRole(String auth0Id) {
        identities.assignDefaultRole(auth0Id);
        return ResponseEntity.noContent().build();
    }
}
