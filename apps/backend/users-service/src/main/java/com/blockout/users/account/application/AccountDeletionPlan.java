package com.blockout.users.account.application;

import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.users.models.enums.EntityType;
import java.util.List;

/** Captures the proven provider-first account-deletion work without changing retention policy. */
public record AccountDeletionPlan(
        Long accountId,
        String identityId,
        String retainedProfileImageUrl,
        List<FavoriteDeletion> favoriteDeletions) {

    /** Retains an immutable favorite snapshot while preserving nullable legacy behavior. */
    public AccountDeletionPlan {
        favoriteDeletions = favoriteDeletions == null ? null : List.copyOf(favoriteDeletions);
    }

    /** Builds the plan from the transaction-bound account snapshot. */
    public static AccountDeletionPlan from(UserAccountView account) {
        List<FavoriteDeletion> deletions = account.favorites() == null
                ? null
                : account.favorites().stream().map(FavoriteDeletion::from).toList();
        return new AccountDeletionPlan(account.id(), account.auth0Id(), account.pictureUrl(), deletions);
    }

    /** Identifies one follower-projection fact recorded before local cascade deletion. */
    public record FavoriteDeletion(EntityType entityType, Long entityId) {

        private static FavoriteDeletion from(FavoriteView favorite) {
            return new FavoriteDeletion(favorite.entityType(), favorite.entityId());
        }
    }
}
