package com.blockout.users.account.application;

/** Carries the nullable picture update produced by one storage plan. */
public record ProfileImageMutationResult(String url, boolean replace) {

    /** Keeps the persisted picture untouched. */
    public static ProfileImageMutationResult keep() {
        return new ProfileImageMutationResult(null, false);
    }

    /** Replaces the persisted picture with a nullable URL. */
    public static ProfileImageMutationResult replace(String url) {
        return new ProfileImageMutationResult(url, true);
    }
}
