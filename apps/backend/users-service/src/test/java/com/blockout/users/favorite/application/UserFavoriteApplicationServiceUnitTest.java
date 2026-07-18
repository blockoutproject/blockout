package com.blockout.users.favorite.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.models.enums.EntityType;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Protects canonical favorite authority and retained derived-projection sequencing. */
@DisplayName("User favorite application service")
class UserFavoriteApplicationServiceUnitTest {

    @Test
    @DisplayName("keeps an existing follow as a projection-free no-op")
    void keepsExistingFollowAsNoOp() {
        Fixture fixture = new Fixture();
        fixture.followChanged = false;

        fixture.service.follow(new FavoriteCommand("auth0|owner", EntityType.TEAM, 11L));

        assertThat(fixture.calls).containsExactly("favoriteFollow");
    }

    @Test
    @DisplayName("follows in canonical team notification order")
    void followsInCanonicalTeamNotificationOrder() {
        Fixture fixture = new Fixture();

        fixture.service.follow(new FavoriteCommand("auth0|owner", EntityType.TEAM, 11L));

        assertThat(fixture.calls).containsExactly(
                "favoriteFollow", "teamIncrement", "eventCreated");
    }

    @Test
    @DisplayName("unfollows in canonical pool notification order")
    void unfollowsInCanonicalPoolNotificationOrder() {
        Fixture fixture = new Fixture();
        fixture.unfollowChanged = true;

        fixture.service.unfollow(new FavoriteCommand("auth0|owner", EntityType.POOL, 13L));

        assertThat(fixture.calls).containsExactly(
                "favoriteUnfollow", "poolDecrement", "eventDeleted");
    }

    @Test
    @DisplayName("keeps an absent unfollow as a projection-free no-op")
    void keepsAbsentUnfollowAsNoOp() {
        Fixture fixture = new Fixture();

        fixture.service.unfollow(new FavoriteCommand("auth0|owner", EntityType.POOL, 13L));

        assertThat(fixture.calls).containsExactly("favoriteUnfollow");
    }

    @Test
    @DisplayName("returns the canonical page supplied by persistence")
    void returnsCanonicalPage() {
        Fixture fixture = new Fixture();

        FavoritePage result = fixture.service.listPage(7L, null, 0, 2);

        assertThat(result.items()).containsExactly(fixture.view);
        assertThat(result.totalItems()).isEqualTo(3);
        assertThat(result.hasNext()).isTrue();
        assertThat(fixture.calls).containsExactly("ownerExists", "findPage");
    }

    @Test
    @DisplayName("exposes bounded canonical inputs for projection rebuilds")
    void exposesBoundedCanonicalProjectionInputs() {
        Fixture fixture = new Fixture();

        FavoriteProjectionSnapshot userSnapshot = fixture.service.snapshotForUser(7L);
        FollowerCountSnapshot targetSnapshot = fixture.service.snapshotForTarget(EntityType.TEAM, 11L);

        assertThat(userSnapshot.favorites()).containsExactly(new FavoriteTarget(EntityType.TEAM, 11L));
        assertThat(targetSnapshot.followerCount()).isEqualTo(3);
        assertThat(fixture.calls).containsExactly("ownerExists", "snapshotUser", "snapshotTarget");
    }

    @Test
    @DisplayName("rejects an unknown Auth0 identity before side effects")
    void rejectsUnknownIdentityBeforeSideEffects() {
        Fixture fixture = new Fixture();
        fixture.auth0UserPresent = false;

        assertThatThrownBy(() -> fixture.service.follow(
                new FavoriteCommand("auth0|missing", EntityType.TEAM, 11L)))
                .isInstanceOf(CustomUserNotFoundException.class);

        assertThat(fixture.calls).isEmpty();
    }

    private static final class Fixture {

        private final List<String> calls = new ArrayList<>();
        private final FavoriteView view = new FavoriteView(
                5L, EntityType.TEAM, 11L, LocalDateTime.parse("2026-07-01T09:00:00"));
        private boolean auth0UserPresent = true;
        private boolean followChanged = true;
        private boolean unfollowChanged;

        private final FavoriteStore store = new FavoriteStore() {
            @Override
            public Optional<FavoriteOwner> findOwnerByAuth0Id(String auth0Id) {
                return auth0UserPresent ? Optional.of(owner()) : Optional.empty();
            }

            @Override
            public boolean ownerExists(Long userId) {
                calls.add("ownerExists");
                return true;
            }

            @Override
            public List<FavoriteView> findUnpaged(Long userId, EntityType entityType) {
                calls.add("findUnpaged");
                return List.of(view);
            }

            @Override
            public FavoritePage findPage(Long userId, EntityType entityType, int page, int pageSize) {
                calls.add("findPage");
                return new FavoritePage(List.of(view), page, pageSize, 3, true);
            }

            @Override
            public FavoriteProjectionSnapshot snapshotForUser(Long userId) {
                calls.add("snapshotUser");
                return new FavoriteProjectionSnapshot(
                        userId, Set.of(new FavoriteTarget(EntityType.TEAM, 11L)));
            }

            @Override
            public FollowerCountSnapshot snapshotForTarget(EntityType entityType, Long entityId) {
                calls.add("snapshotTarget");
                return new FollowerCountSnapshot(new FavoriteTarget(entityType, entityId), 3);
            }
        };

        private final FavoriteProjectionCoordinator coordinator = new FavoriteProjectionCoordinator(
                teamProjection(), poolProjection(), eventPublisher());
        private final UserFavoriteApplicationService service = new UserFavoriteApplicationService(store, coordinator);

        private FavoriteOwner owner() {
            return new FavoriteOwner() {
                @Override
                public Long userId() {
                    return 7L;
                }

                @Override
                public Optional<FavoriteChange> follow(FavoriteTarget target) {
                    calls.add("favoriteFollow");
                    return followChanged
                            ? Optional.of(new FavoriteChange(7L, target, FavoriteEventAction.FOLLOWED, 5L))
                            : Optional.empty();
                }

                @Override
                public Optional<FavoriteChange> unfollow(FavoriteTarget target) {
                    calls.add("favoriteUnfollow");
                    return unfollowChanged
                            ? Optional.of(new FavoriteChange(7L, target, FavoriteEventAction.UNFOLLOWED, null))
                            : Optional.empty();
                }
            };
        }

        private TeamFollowerProjection teamProjection() {
            return new TeamFollowerProjection() {
                @Override
                public void increment(Long teamId, Long userId) {
                    calls.add("teamIncrement");
                }

                @Override
                public void decrement(Long teamId, Long userId) {
                    calls.add("teamDecrement");
                }
            };
        }

        private PoolFollowerProjection poolProjection() {
            return new PoolFollowerProjection() {
                @Override
                public void increment(Long poolId, Long userId) {
                    calls.add("poolIncrement");
                }

                @Override
                public void decrement(Long poolId, Long userId) {
                    calls.add("poolDecrement");
                }
            };
        }

        private FavoriteEventPublisher eventPublisher() {
            return new FavoriteEventPublisher() {
                @Override
                public void publishCreated(Long userId, EntityType entityType, Long entityId) {
                    calls.add("eventCreated");
                }

                @Override
                public void publishDeleted(Long userId, EntityType entityType, Long entityId) {
                    calls.add("eventDeleted");
                }
            };
        }
    }
}
