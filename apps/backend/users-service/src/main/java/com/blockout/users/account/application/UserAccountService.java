package com.blockout.users.account.application;

/** Exposes account and profile use cases without transport or persistence models. */
public interface UserAccountService {

    /** Resolves an account by its Auth0 compatibility identity. */
    UserAccountView getByAuth0Id(String auth0Id);

    /** Updates the profile associated with the supplied Auth0 identity. */
    UserAccountView updateByAuth0Id(String auth0Id, UpdateUserProfileCommand command);

    /** Creates or synchronizes the account associated with the current Auth0 identity. */
    UserAccountView ensureCurrent(String auth0Id);

    /** Deletes the account associated with the current Auth0 identity using the retained ordering. */
    void deleteCurrent(String auth0Id);
}
