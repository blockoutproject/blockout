package com.blockout.users.account.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Executes profile-image plans through the object-storage port without adding compensation. */
@Component
@RequiredArgsConstructor
public class ProfileImagePlanExecutor {

    private static final String PROFILE_FOLDER = "users";

    private final ProfileImageStorage storage;

    /** Preserves keep, delete-before-clear, and delete-before-upload ordering. */
    public ProfileImageMutationResult execute(ProfileImageMutationPlan plan) {
        return switch (plan.mode()) {
            case KEEP -> ProfileImageMutationResult.keep();
            case REMOVE -> {
                deleteCurrent(plan.currentUrl());
                yield ProfileImageMutationResult.replace(null);
            }
            case REPLACE -> {
                deleteCurrent(plan.currentUrl());
                yield ProfileImageMutationResult.replace(storage.upload(plan.replacement(), PROFILE_FOLDER));
            }
        };
    }

    private void deleteCurrent(String currentUrl) {
        if (currentUrl != null) {
            storage.deleteByUrl(currentUrl);
        }
    }
}
