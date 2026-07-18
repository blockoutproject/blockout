package com.blockout.users.account.application;

/** Retains one loaded local account across a transactional mutation workflow. */
public interface UserAccountUpdate {

    /** Returns the current immutable account state. */
    UserAccountView current();

    /** Applies the external-identity fields historically synchronized by ensure. */
    UserAccountChange synchronize(UserIdentitySynchronization synchronization);

    /** Applies the profile fields and reactivation decision owned by profile mutation. */
    UserAccountChange updateProfile(UserProfileChange change);

    /** Deletes the retained local account after provider and favorite side effects succeed. */
    void delete();
}
