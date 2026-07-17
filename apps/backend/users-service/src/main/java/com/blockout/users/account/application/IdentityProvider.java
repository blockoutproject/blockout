package com.blockout.users.account.application;

/** Exposes only the Auth0 management capabilities required by account use cases. */
public interface IdentityProvider {

    /** Reads one external identity profile. */
    IdentityProfile get(String auth0Id);

    /** Deletes one external identity. */
    void delete(String auth0Id);

    /** Attempts to link a secondary identity to the retained primary identity. */
    boolean link(String primaryAuth0Id, String secondaryAuth0Id);

    /** Adds the configured default role without a preflight role lookup. */
    void assignDefaultRole(String auth0Id);
}
