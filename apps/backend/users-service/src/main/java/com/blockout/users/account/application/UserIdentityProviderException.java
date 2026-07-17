package com.blockout.users.account.application;

/** Wraps a retained Auth0 failure for generated controller signatures that cannot expose checked exceptions. */
public class UserIdentityProviderException extends RuntimeException {

    /** Creates the adapter-safe failure from the original Auth0 exception. */
    public UserIdentityProviderException(Throwable cause) {
        super(cause.getMessage(), cause);
    }
}
