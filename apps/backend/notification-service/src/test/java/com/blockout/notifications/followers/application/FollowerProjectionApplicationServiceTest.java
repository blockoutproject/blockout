package com.blockout.notifications.followers.application;

import com.blockout.shared.model.FollowerProjectionMutationEnum;
import com.blockout.shared.model.FollowerProjectionActionEnum;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.blockout.shared.model.EntityTypeEnum;
import java.util.LinkedHashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class FollowerProjectionApplicationServiceTest {

    @Test
    void appliesFollowAndUnfollowIdempotently() {
        MemoryStore store = new MemoryStore();
        FollowerProjectionApplicationService service = new FollowerProjectionApplicationService(store);
        var follow = new FollowerProjectionCommand(7L, EntityTypeEnum.TEAM, 2L, FollowerProjectionActionEnum.FOLLOW);
        var unfollow = new FollowerProjectionCommand(7L, EntityTypeEnum.POOL, 4L, FollowerProjectionActionEnum.UNFOLLOW);

        assertThat(service.apply(follow)).isEqualTo(FollowerProjectionMutationEnum.APPLIED);
        assertThat(service.apply(follow)).isEqualTo(FollowerProjectionMutationEnum.UNCHANGED);
        assertThat(service.apply(unfollow)).isEqualTo(FollowerProjectionMutationEnum.UNCHANGED);

        assertThat(store.rows).containsExactly(new FollowerProjectionTarget(EntityTypeEnum.TEAM, 2L));
    }

    @Test
    void reconcilesAUserProjectionFromTheCanonicalFavoriteSnapshot() {
        MemoryStore store = new MemoryStore();
        store.rows.add(new FollowerProjectionTarget(EntityTypeEnum.TEAM, 2L));
        store.rows.add(new FollowerProjectionTarget(EntityTypeEnum.POOL, 4L));
        FollowerProjectionApplicationService service = new FollowerProjectionApplicationService(store);

        FollowerProjectionReconciliation result = service.reconcile(new FollowerProjectionSnapshot(7L, Set.of(
                new FollowerProjectionTarget(EntityTypeEnum.TEAM, 2L),
                new FollowerProjectionTarget(EntityTypeEnum.POOL, 5L))));

        assertThat(result.added()).containsExactly(new FollowerProjectionTarget(EntityTypeEnum.POOL, 5L));
        assertThat(result.removed()).containsExactly(new FollowerProjectionTarget(EntityTypeEnum.POOL, 4L));
        assertThat(result.retained()).containsExactly(new FollowerProjectionTarget(EntityTypeEnum.TEAM, 2L));
        assertThat(store.rows).containsExactlyInAnyOrder(
                new FollowerProjectionTarget(EntityTypeEnum.TEAM, 2L),
                new FollowerProjectionTarget(EntityTypeEnum.POOL, 5L));
    }

    @Test
    void anAlreadyAlignedSnapshotProducesAnEmptyRepairPlan() {
        MemoryStore store = new MemoryStore();
        store.rows.add(new FollowerProjectionTarget(EntityTypeEnum.TEAM, 2L));
        FollowerProjectionApplicationService service = new FollowerProjectionApplicationService(store);

        FollowerProjectionReconciliation result = service.reconcile(new FollowerProjectionSnapshot(
                7L, Set.of(new FollowerProjectionTarget(EntityTypeEnum.TEAM, 2L))));

        assertThat(result.added()).isEmpty();
        assertThat(result.removed()).isEmpty();
        assertThat(result.retained()).containsExactly(new FollowerProjectionTarget(EntityTypeEnum.TEAM, 2L));
    }

    @Test
    void rejectsNonPositiveCanonicalUserIds() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new FollowerProjectionSnapshot(0L, Set.of()));
    }

    private static final class MemoryStore implements FollowerProjectionStore {
        private final Set<FollowerProjectionTarget> rows = new LinkedHashSet<>();

        @Override
        public boolean add(Long userId, FollowerProjectionTarget target) {
            return rows.add(target);
        }

        @Override
        public boolean remove(Long userId, FollowerProjectionTarget target) {
            return rows.remove(target);
        }

        @Override
        public Set<FollowerProjectionTarget> findByUserId(Long userId) {
            return Set.copyOf(rows);
        }
    }
}
