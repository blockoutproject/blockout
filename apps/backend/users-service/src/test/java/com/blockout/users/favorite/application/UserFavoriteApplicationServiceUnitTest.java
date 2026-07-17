package com.blockout.users.favorite.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.models.entities.UserFavorite;
import com.blockout.users.models.enums.EntityType;
import com.blockout.users.repositories.UserFavoriteRepository;
import com.blockout.users.repositories.UserRepository;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

/** Protects canonical favorite authority and retained side-effect sequencing. */
@DisplayName("User favorite application service")
class UserFavoriteApplicationServiceUnitTest {

    /** Proves an existing favorite remains an idempotent local no-op. */
    @Test
    @DisplayName("keeps an existing follow as a no-op")
    void keepsExistingFollowAsNoOp() {
        Fixture fixture = new Fixture();
        fixture.favoriteExists = true;

        fixture.service.follow(new FavoriteCommand("auth0|owner", EntityType.TEAM, 11L));

        assertThat(fixture.calls).containsExactly("favoriteExists");
    }

    /** Proves local ownership is persisted before the derived counter and legacy event. */
    @Test
    @DisplayName("follows in local counter event order")
    void followsInLocalCounterEventOrder() {
        Fixture fixture = new Fixture();

        fixture.service.follow(new FavoriteCommand("auth0|owner", EntityType.TEAM, 11L));

        assertThat(fixture.calls).containsExactly(
                "favoriteExists", "save", "teamIncrement", "eventCreated");
        assertThat(fixture.saved.getUser()).isSameAs(fixture.user);
        assertThat(fixture.saved.getEntityType()).isEqualTo(EntityType.TEAM);
        assertThat(fixture.saved.getEntityId()).isEqualTo(11L);
    }

    /** Proves a removed favorite updates the pool projection before publishing deletion. */
    @Test
    @DisplayName("unfollows in local counter event order")
    void unfollowsInLocalCounterEventOrder() {
        Fixture fixture = new Fixture();
        fixture.deleted = 1;

        fixture.service.unfollow(new FavoriteCommand("auth0|owner", EntityType.POOL, 13L));

        assertThat(fixture.calls).containsExactly("delete", "poolDecrement", "eventDeleted");
    }

    /** Proves an absent favorite remains an idempotent delete no-op. */
    @Test
    @DisplayName("keeps an absent unfollow as a no-op")
    void keepsAbsentUnfollowAsNoOp() {
        Fixture fixture = new Fixture();

        fixture.service.unfollow(new FavoriteCommand("auth0|owner", EntityType.POOL, 13L));

        assertThat(fixture.calls).containsExactly("delete");
    }

    /** Proves v2 pages use the approved stable order and expose exact count metadata. */
    @Test
    @DisplayName("pages favorites by creation and storage identity")
    void pagesFavoritesByCreationAndStorageIdentity() {
        Fixture fixture = new Fixture();

        FavoritePage result = fixture.service.listPage(7L, null, 0, 2);

        assertThat(result.items()).containsExactly(fixture.view);
        assertThat(result.totalItems()).isEqualTo(3);
        assertThat(result.hasNext()).isTrue();
        assertThat(fixture.pageable.getSort().toString()).isEqualTo("createdAt: ASC,id: ASC");
    }

    /** Proves all favorite operations reject an unresolved local identity. */
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

    /** Supplies deterministic repository and port doubles without a JVM instrumentation agent. */
    private static final class Fixture {

        private final List<String> calls = new ArrayList<>();
        private final CustomUser user = CustomUser.builder()
                .id(7L)
                .auth0Id("auth0|owner")
                .email("owner@example.com")
                .pseudo("owner")
                .build();
        private final UserFavorite entity = UserFavorite.builder()
                .id(5L)
                .user(user)
                .entityType(EntityType.TEAM)
                .entityId(11L)
                .createdAt(LocalDateTime.parse("2026-07-01T09:00:00"))
                .build();
        private final FavoriteView view = new FavoriteView(
                5L, EntityType.TEAM, 11L, LocalDateTime.parse("2026-07-01T09:00:00"));

        private boolean auth0UserPresent = true;
        private boolean favoriteExists;
        private int deleted;
        private UserFavorite saved;
        private Pageable pageable;

        private final UserFavoriteApplicationService service = new UserFavoriteApplicationService(
                favoriteRepository(),
                userRepository(),
                favorite -> view,
                teamProjection(),
                poolProjection(),
                eventPublisher());

        /** Provides only the repository behavior exercised by this application slice. */
        private UserFavoriteRepository favoriteRepository() {
            return proxy(UserFavoriteRepository.class, (method, arguments) -> switch (method) {
                case "existsByUserAndEntityTypeAndEntityId" -> {
                    calls.add("favoriteExists");
                    yield favoriteExists;
                }
                case "save" -> {
                    calls.add("save");
                    saved = (UserFavorite) arguments[0];
                    saved.setId(5L);
                    yield saved;
                }
                case "deleteByUserAndEntityTypeAndEntityId" -> {
                    calls.add("delete");
                    yield deleted;
                }
                case "findByUserId" -> {
                    if (arguments.length == 1) {
                        yield List.of(entity);
                    }
                    pageable = (Pageable) arguments[1];
                    yield new PageImpl<>(List.of(entity), pageable, 3);
                }
                case "findByUserIdAndEntityType" -> {
                    if (arguments.length == 2) {
                        yield List.of(entity);
                    }
                    pageable = (Pageable) arguments[2];
                    yield new PageImpl<>(List.of(entity), pageable, 3);
                }
                default -> throw new UnsupportedOperationException(method);
            });
        }

        /** Provides local numeric and Auth0 identity lookup behavior. */
        private UserRepository userRepository() {
            return proxy(UserRepository.class, (method, arguments) -> switch (method) {
                case "findByAuth0Id" -> auth0UserPresent ? Optional.of(user) : Optional.empty();
                case "existsById" -> true;
                default -> throw new UnsupportedOperationException(method);
            });
        }

        /** Records team projection mutations in workflow order. */
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

        /** Records pool projection mutations in workflow order. */
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

        /** Records retained event publication in workflow order. */
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

        /** Creates a minimal dynamic repository double and handles Object methods safely. */
        @SuppressWarnings("unchecked")
        private static <T> T proxy(Class<T> type, RepositoryCall call) {
            return (T) Proxy.newProxyInstance(
                    type.getClassLoader(),
                    new Class<?>[] {type},
                    (proxy, method, arguments) -> switch (method.getName()) {
                        case "toString" -> type.getSimpleName() + "TestDouble";
                        case "hashCode" -> System.identityHashCode(proxy);
                        case "equals" -> proxy == arguments[0];
                        default -> call.invoke(method.getName(), arguments == null ? new Object[0] : arguments);
                    });
        }
    }

    /** Invokes one repository operation by method name. */
    @FunctionalInterface
    private interface RepositoryCall {
        Object invoke(String method, Object[] arguments);
    }
}
