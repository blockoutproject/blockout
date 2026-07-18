package com.blockout.users.favorite.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.users.account.persistence.UserAccountEntity;
import com.blockout.users.account.persistence.UserAccountRepository;
import com.blockout.users.favorite.application.FavoriteChange;
import com.blockout.users.favorite.application.FavoriteOwner;
import com.blockout.users.favorite.application.FavoritePage;
import com.blockout.users.favorite.application.FavoriteTarget;
import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.shared.model.EntityTypeEnum;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

/** Proves retained query, transition, ordering, and snapshot semantics at the favorite persistence edge. */
class JpaFavoriteStoreUnitTest {

    @Test
    void preservesEffectiveAndNoOpCanonicalTransitions() {
        Fixture fixture = new Fixture();
        FavoriteOwner owner = fixture.store.findOwnerByAuth0Id("auth0|owner").orElseThrow();
        FavoriteTarget target = new FavoriteTarget(EntityTypeEnum.TEAM, 11L);

        FavoriteChange followed = owner.follow(target).orElseThrow();
        fixture.favoriteExists = true;
        Optional<FavoriteChange> duplicate = owner.follow(target);
        fixture.deleted = 1;
        FavoriteChange unfollowed = owner.unfollow(target).orElseThrow();

        assertThat(followed.userId()).isEqualTo(7L);
        assertThat(followed.favoriteId()).isEqualTo(5L);
        assertThat(duplicate).isEmpty();
        assertThat(unfollowed.favoriteId()).isNull();
        assertThat(fixture.calls).containsExactly("findOwner", "exists", "save", "exists", "delete");
    }

    @Test
    void preservesStablePageOrderingAndExactMetadata() {
        Fixture fixture = new Fixture();

        FavoritePage result = fixture.store.findPage(7L, null, 0, 2);

        assertThat(result.items()).containsExactly(fixture.view);
        assertThat(result.totalItems()).isEqualTo(3);
        assertThat(result.hasNext()).isTrue();
        assertThat(fixture.pageable.getSort().toString()).isEqualTo("createdAt: ASC,id: ASC");
    }

    @Test
    void derivesBoundedRebuildSnapshotsFromCanonicalRows() {
        Fixture fixture = new Fixture();

        var userSnapshot = fixture.store.snapshotForUser(7L);
        var targetSnapshot = fixture.store.snapshotForTarget(EntityTypeEnum.TEAM, 11L);

        assertThat(userSnapshot.favorites()).containsExactly(new FavoriteTarget(EntityTypeEnum.TEAM, 11L));
        assertThat(targetSnapshot.followerCount()).isEqualTo(3);
        assertThat(fixture.calls).containsExactly("findUserFavorites", "countTarget");
    }

    private static final class Fixture {

        private final List<String> calls = new ArrayList<>();
        private final UserAccountEntity user = UserAccountEntity.builder()
                .id(7L)
                .auth0Id("auth0|owner")
                .email("owner@example.com")
                .pseudo("owner")
                .build();
        private final FavoriteEntity entity = FavoriteEntity.builder()
                .id(5L)
                .user(user)
                .entityType(EntityTypeEnum.TEAM)
                .entityId(11L)
                .createdAt(LocalDateTime.parse("2026-07-01T09:00:00"))
                .build();
        private final FavoriteView view = new FavoriteView(
                5L, EntityTypeEnum.TEAM, 11L, LocalDateTime.parse("2026-07-01T09:00:00"));

        private boolean favoriteExists;
        private int deleted;
        private Pageable pageable;

        private final JpaFavoriteStore store = new JpaFavoriteStore(
                favoriteRepository(), userRepository(), favorite -> view);

        private FavoriteRepository favoriteRepository() {
            return proxy(FavoriteRepository.class, (method, arguments) -> switch (method) {
                case "existsByUserAndEntityTypeAndEntityId" -> {
                    calls.add("exists");
                    yield favoriteExists;
                }
                case "save" -> {
                    calls.add("save");
                    FavoriteEntity saved = (FavoriteEntity) arguments[0];
                    saved.setId(5L);
                    yield saved;
                }
                case "deleteByUserAndEntityTypeAndEntityId" -> {
                    calls.add("delete");
                    yield deleted;
                }
                case "findByUserId" -> {
                    if (arguments.length == 1) {
                        calls.add("findUserFavorites");
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
                case "countByEntityTypeAndEntityId" -> {
                    calls.add("countTarget");
                    yield 3L;
                }
                default -> throw new UnsupportedOperationException(method);
            });
        }

        private UserAccountRepository userRepository() {
            return proxy(UserAccountRepository.class, (method, arguments) -> switch (method) {
                case "findByAuth0Id" -> {
                    calls.add("findOwner");
                    yield Optional.of(user);
                }
                case "existsById" -> true;
                default -> throw new UnsupportedOperationException(method);
            });
        }

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

    @FunctionalInterface
    private interface RepositoryCall {
        Object invoke(String method, Object[] arguments);
    }
}
