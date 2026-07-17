package com.blockout.notifications.followers.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.blockout.notifications.models.entity.FollowersProjection;
import com.blockout.notifications.models.enums.EntityType;
import com.blockout.notifications.repositories.FollowersProjectionRepository;
import com.blockout.notifications.services.FollowersProjectionService;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class FollowersProjectionServiceTest {

    @Test
    void appliesFollowAndUnfollowIdempotently() {
        Fixture fixture = new Fixture();
        var follow = new FollowerProjectionCommand(7L, EntityType.TEAM, 2L, FollowerProjectionAction.FOLLOW);
        var unfollow = new FollowerProjectionCommand(7L, EntityType.POOL, 4L, FollowerProjectionAction.UNFOLLOW);

        fixture.service.apply(follow);
        fixture.service.apply(follow);
        fixture.service.apply(unfollow);

        assertThat(fixture.rows).containsExactly(new FollowerProjectionTarget(EntityType.TEAM, 2L));
        assertThat(fixture.saved).isEqualTo(1);
        assertThat(fixture.deleted).isZero();
    }

    @Test
    void rebuildsAUserProjectionFromTheCanonicalFavoriteSnapshot() {
        Fixture fixture = new Fixture();
        fixture.rows.add(new FollowerProjectionTarget(EntityType.TEAM, 2L));
        fixture.rows.add(new FollowerProjectionTarget(EntityType.POOL, 4L));

        fixture.service.rebuildUser(7L, Set.of(
                new FollowerProjectionTarget(EntityType.TEAM, 2L),
                new FollowerProjectionTarget(EntityType.POOL, 5L)));

        assertThat(fixture.rows).containsExactlyInAnyOrder(
                new FollowerProjectionTarget(EntityType.TEAM, 2L),
                new FollowerProjectionTarget(EntityType.POOL, 5L));
        assertThat(fixture.saved).isEqualTo(1);
        assertThat(fixture.deleted).isEqualTo(1);
    }

    @Test
    void rejectsNonPositiveCanonicalUserIds() {
        Fixture fixture = new Fixture();
        assertThatIllegalArgumentException().isThrownBy(() -> fixture.service.rebuildUser(0L, Set.of()));
    }

    private static final class Fixture {
        private final Set<FollowerProjectionTarget> rows = new HashSet<>();
        private int saved;
        private int deleted;
        private final FollowersProjectionService service = new FollowersProjectionService(repository());

        private FollowersProjectionRepository repository() {
            return (FollowersProjectionRepository) Proxy.newProxyInstance(
                    FollowersProjectionRepository.class.getClassLoader(),
                    new Class<?>[] {FollowersProjectionRepository.class},
                    (proxy, method, arguments) -> switch (method.getName()) {
                        case "toString" -> "FollowersProjectionRepositoryTestDouble";
                        case "hashCode" -> System.identityHashCode(proxy);
                        case "equals" -> proxy == arguments[0];
                        case "existsByEntityTypeAndEntityIdAndUserId" -> rows.contains(new FollowerProjectionTarget(
                                (EntityType) arguments[0], (Long) arguments[1]));
                        case "save" -> {
                            FollowersProjection entity = (FollowersProjection) arguments[0];
                            rows.add(new FollowerProjectionTarget(entity.getEntityType(), entity.getEntityId()));
                            saved++;
                            yield entity;
                        }
                        case "deleteByEntityTypeAndEntityIdAndUserId" -> {
                            boolean removed = rows.remove(new FollowerProjectionTarget(
                                    (EntityType) arguments[0], (Long) arguments[1]));
                            if (removed) deleted++;
                            yield removed ? 1 : 0;
                        }
                        case "findByUserId" -> {
                            List<FollowersProjection> result = new ArrayList<>();
                            for (FollowerProjectionTarget row : rows) {
                                result.add(FollowersProjection.builder()
                                        .userId((Long) arguments[0])
                                        .entityType(row.entityType())
                                        .entityId(row.entityId())
                                        .build());
                            }
                            yield result;
                        }
                        default -> throw new UnsupportedOperationException(method.getName());
                    });
        }
    }
}
