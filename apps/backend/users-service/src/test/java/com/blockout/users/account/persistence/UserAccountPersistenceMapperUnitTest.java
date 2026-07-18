package com.blockout.users.account.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.users.account.application.NewUserAccount;
import com.blockout.users.account.application.UserAccountView;
import com.blockout.users.favorite.persistence.FavoritePersistenceMapperImpl;
import com.blockout.users.models.entities.UserFavorite;
import com.blockout.users.models.enums.EntityType;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Proves structural mapping at the account persistence edge. */
class UserAccountPersistenceMapperUnitTest {

    private final UserAccountPersistenceMapper mapper =
            new UserAccountPersistenceMapperImpl(new FavoritePersistenceMapperImpl());

    @Test
    void mapsPersistedAccountAndFavoritesToTheApplicationView() {
        Instant timestamp = Instant.parse("2026-07-01T10:00:00Z");
        UserAccountEntity entity = UserAccountEntity.builder()
                .id(7L)
                .auth0Id("auth0|owner")
                .email("owner@example.com")
                .pseudo("owner")
                .pictureUrl("https://cdn.example/owner.png")
                .active(true)
                .createdAt(timestamp)
                .lastUpdate(timestamp)
                .favorites(List.of(UserFavorite.builder()
                        .id(5L)
                        .entityType(EntityType.TEAM)
                        .entityId(11L)
                        .createdAt(LocalDateTime.parse("2026-07-01T12:00:00"))
                        .build()))
                .build();

        UserAccountView view = mapper.toView(entity);

        assertThat(view.id()).isEqualTo(7L);
        assertThat(view.auth0Id()).isEqualTo("auth0|owner");
        assertThat(view.favorites()).singleElement().satisfies(favorite -> {
            assertThat(favorite.id()).isEqualTo(5L);
            assertThat(favorite.entityType()).isEqualTo(EntityType.TEAM);
            assertThat(favorite.entityId()).isEqualTo(11L);
        });
    }

    @Test
    void mapsNewAccountIntentWithoutInventingPersistenceIdentityOrFavorites() {
        Instant timestamp = Instant.parse("2026-07-01T10:00:00Z");
        NewUserAccount account = new NewUserAccount(
                "auth0|new",
                "new@example.com",
                "new",
                "First",
                "Last",
                "https://identity.example/picture.png",
                "+33123456789",
                true,
                timestamp,
                timestamp);

        UserAccountEntity entity = mapper.toEntity(account);

        assertThat(entity.getId()).isNull();
        assertThat(entity.getFavorites()).isNull();
        assertThat(entity.getAuth0Id()).isEqualTo("auth0|new");
        assertThat(entity.getEmail()).isEqualTo("new@example.com");
        assertThat(entity.getCreatedAt()).isEqualTo(timestamp);
    }
}
