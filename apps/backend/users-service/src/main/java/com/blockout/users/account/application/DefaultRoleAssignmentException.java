package com.blockout.users.account.application;

/** Preserves the existing generic failure boundary for default Auth0 role assignment. */
public class DefaultRoleAssignmentException extends RuntimeException {

    /** Wraps the provider failure with the retained service message. */
    public DefaultRoleAssignmentException(Throwable cause) {
        super("Erreur assignation rôle", cause);
    }
}
