package com.blockout.users.account.application;

/** Captures one explicit profile-image storage plan before any external effect occurs. */
public record ProfileImageMutationPlan(
        UserProfileImageChange.Mode mode,
        String currentUrl,
        UserProfileImageUpload replacement) {

    /** Builds the storage plan from the retained account state and validated image intent. */
    public static ProfileImageMutationPlan from(String currentUrl, UserProfileImageChange change) {
        return new ProfileImageMutationPlan(change.mode(), currentUrl, change.upload());
    }
}
