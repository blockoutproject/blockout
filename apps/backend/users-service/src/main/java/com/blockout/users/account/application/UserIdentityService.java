package com.blockout.users.account.application;

/** Owns local account synchronization, deletion, and identity-administration workflows. */
public interface UserIdentityService {

    /** Creates or synchronizes the local account for one external identity. */
    UserAccountView ensureCurrent(String auth0Id);

    /** Deletes the external identity first, then retained local favorite/account state. */
    void deleteCurrent(String auth0Id);

    /** Adds the configured default role through the identity provider. */
    void assignDefaultRole(String auth0Id);
}
