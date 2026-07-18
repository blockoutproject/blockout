package com.blockout.notifications.followers.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.followers.application.FollowerProjectionTarget;
import com.blockout.notifications.models.enums.EntityType;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

class JpaFollowerProjectionStoreTest {

    @Test
    void mapsAtomicAddsAndRemovesWithoutExposingRows() {
        List<String> calls = new ArrayList<>();
        FollowerProjectionRepository repository = repository(calls, List.of());
        JpaFollowerProjectionStore store = new JpaFollowerProjectionStore(repository);

        assertThat(store.add(7L, new FollowerProjectionTarget(EntityType.TEAM, 2L))).isTrue();
        assertThat(store.remove(7L, new FollowerProjectionTarget(EntityType.POOL, 4L))).isFalse();

        assertThat(calls).containsExactly(
                "insert:7:TEAM:2",
                "delete:POOL:4:7");
    }

    @Test
    void projectsBoundedRowsIntoApplicationTargets() {
        FollowerProjectionEntity team = FollowerProjectionEntity.builder()
                .userId(7L)
                .entityType(EntityType.TEAM)
                .entityId(2L)
                .build();
        FollowerProjectionEntity pool = FollowerProjectionEntity.builder()
                .userId(7L)
                .entityType(EntityType.POOL)
                .entityId(4L)
                .build();
        JpaFollowerProjectionStore store = new JpaFollowerProjectionStore(
                repository(new ArrayList<>(), List.of(team, pool)));

        assertThat(store.findByUserId(7L)).containsExactlyInAnyOrder(
                new FollowerProjectionTarget(EntityType.TEAM, 2L),
                new FollowerProjectionTarget(EntityType.POOL, 4L));
    }

    @Test
    void addQueryUsesTheDeployedUniqueTupleAsItsAtomicIdempotencyGate() throws Exception {
        String query = FollowerProjectionRepository.class
                .getMethod(
                        "insertIfAbsent",
                        Long.class,
                        String.class,
                        Long.class,
                        LocalDateTime.class,
                        LocalDateTime.class)
                .getAnnotation(Query.class)
                .value();

        assertThat(query)
                .contains("INSERT INTO followers_projection")
                .contains("ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING");
    }

    private FollowerProjectionRepository repository(
            List<String> calls,
            List<FollowerProjectionEntity> rows) {
        return (FollowerProjectionRepository) Proxy.newProxyInstance(
                FollowerProjectionRepository.class.getClassLoader(),
                new Class<?>[] {FollowerProjectionRepository.class},
                (proxy, method, arguments) -> switch (method.getName()) {
                    case "insertIfAbsent" -> {
                        calls.add("insert:%s:%s:%s".formatted(arguments[0], arguments[1], arguments[2]));
                        yield 1;
                    }
                    case "deleteByEntityTypeAndEntityIdAndUserId" -> {
                        calls.add("delete:%s:%s:%s".formatted(arguments));
                        yield 0;
                    }
                    case "findByUserId" -> rows;
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }
}
