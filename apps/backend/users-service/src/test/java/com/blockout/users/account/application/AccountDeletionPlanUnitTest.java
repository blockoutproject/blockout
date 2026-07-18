package com.blockout.users.account.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.users.models.enums.EntityType;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class AccountDeletionPlanUnitTest {

    @Test
    void snapshotsFavoriteFactsAndMakesProfileImageRetentionExplicit() {
        List<FavoriteView> favorites = new ArrayList<>();
        favorites.add(new FavoriteView(5L, EntityType.TEAM, 11L, null));
        Instant timestamp = Instant.parse("2026-07-01T10:00:00Z");
        UserAccountView account = new UserAccountView(
                7L,
                "auth0|owner",
                "owner@example.com",
                "owner",
                null,
                null,
                "https://cdn.example/retained.png",
                null,
                true,
                timestamp,
                timestamp,
                favorites);

        AccountDeletionPlan plan = AccountDeletionPlan.from(account);
        favorites.clear();

        assertThat(plan.accountId()).isEqualTo(7L);
        assertThat(plan.identityId()).isEqualTo("auth0|owner");
        assertThat(plan.retainedProfileImageUrl()).isEqualTo("https://cdn.example/retained.png");
        assertThat(plan.favoriteDeletions())
                .containsExactly(new AccountDeletionPlan.FavoriteDeletion(EntityType.TEAM, 11L));
    }
}
