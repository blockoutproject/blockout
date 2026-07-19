package com.blockout.users.user.application.ports;

import com.blockout.users.user.application.models.ExternalUserProfile;

public interface UserIdentityProvider {

    ExternalUserProfile getUser(String externalId);

    void deleteUser(String externalId);

    void assignDefaultRole(String externalId);

    boolean linkIdentity(String primaryExternalId, String secondaryExternalId, String provider);
}
