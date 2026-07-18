package com.blockout.pools.pool.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.pools.pool.persistence.PoolEntity;
import com.blockout.pools.pool.persistence.JpaPoolStore;
import com.blockout.pools.pool.persistence.PoolPersistenceMapper;
import com.blockout.pools.pool.persistence.PoolRepository;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class PoolServiceTest {

    private final PoolPersistenceMapper mapper = Mappers.getMapper(PoolPersistenceMapper.class);

    @Test
    void canonicalCreateOwnsIdentifierFollowersLifecycleAndAuditFields() {
        RepositoryDouble repository = new RepositoryDouble();
        EventPublisherDouble publisher = new EventPublisherDouble();
        PoolService service = service(repository, publisher);

        PoolView result = service.create(command());

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.followersCount()).isZero();
        assertThat(result.active()).isTrue();
        assertThat(publisher.published).containsExactly(PoolUpsertFact.from(result));
    }

    @Test
    void updatePreservesNullFieldsAndExplicitlyReactivates() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = entity(false, 4L);
        PoolService service = service(repository, new EventPublisherDouble());

        PoolView result = service.update(1L, new UpdatePoolCommand(
                null, null, null, null, null, "Updated", null, null, null, null, true));

        assertThat(result.rawName()).isEqualTo("Raw");
        assertThat(result.name()).isEqualTo("Updated");
        assertThat(result.active()).isTrue();
    }

    @Test
    void followerDecrementKeepsTheExistingZeroFloor() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = entity(true, 0L);
        JpaPoolStore store = store(repository);
        PoolFollowerProjectionService service = new PoolFollowerProjectionService(store);

        PoolView result = service.updateFollowers(
                new PoolFollowerCommand(1L, 9L, PoolFollowerCommand.Delta.DECREMENT));

        assertThat(result.followersCount()).isZero();
    }

    @Test
    void directDeactivationRemainsASoftLifecycleWrite() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = entity(true, 2L);
        JpaPoolStore store = store(repository);
        PoolLifecycleService service = new PoolLifecycleService(store);

        service.deactivate(1L);

        assertThat(repository.entity.getActive()).isFalse();
    }

    @Test
    void canonicalPageUsesStableSeasonNameAndIdentifierOrdering() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.pageItems = List.of(entity(true, 2L));
        PoolService service = service(repository, new EventPublisherDouble());

        PoolPage result = service.findPage(new PoolFilter(null, null, true, null), 0, 25);

        assertThat(repository.pageable.getSort().getOrderFor("season").isDescending()).isTrue();
        assertThat(repository.pageable.getSort().getOrderFor("name").isAscending()).isTrue();
        assertThat(repository.pageable.getSort().getOrderFor("name").getNullHandling().name()).isEqualTo("NULLS_LAST");
        assertThat(repository.pageable.getSort().getOrderFor("id").isAscending()).isTrue();
        assertThat(result.items()).hasSize(1);
    }

    private PoolService service(RepositoryDouble repository, EventPublisherDouble publisher) {
        return new PoolService(store(repository), publisher);
    }

    private JpaPoolStore store(RepositoryDouble repository) {
        return new JpaPoolStore(repository.proxy(), mapper);
    }

    private CreatePoolCommand command() {
        return new CreatePoolCommand("P1", "L1", "2026", "League", "Raw", "Pool", "PL", 2L,
                FormatEnum.SIX, GenderEnum.M);
    }

    private PoolEntity entity(boolean active, long followers) {
        return PoolEntity.builder().id(1L).poolCode("P1").leagueCode("L1").season("2026")
                .leagueName("League").rawName("Raw").name("Pool").shortName("PL").divisionId(2L)
                .format(FormatEnum.SIX).gender(GenderEnum.M).followersCount(followers).active(active)
                .createdAt(LocalDateTime.parse("2026-01-01T00:00:00"))
                .lastUpdate(LocalDateTime.parse("2026-01-02T00:00:00")).build();
    }

    private static final class RepositoryDouble implements InvocationHandler {
        private PoolEntity entity;
        private List<PoolEntity> pageItems = List.of();
        private Pageable pageable;

        PoolRepository proxy() {
            return (PoolRepository) Proxy.newProxyInstance(
                    PoolRepository.class.getClassLoader(), new Class<?>[]{PoolRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "save" -> {
                    entity = (PoolEntity) arguments[0];
                    if (entity.getId() == null) {
                        entity.setId(1L);
                    }
                    yield entity;
                }
                case "findById" -> Optional.ofNullable(entity);
                case "findFiltered" -> {
                    pageable = (Pageable) arguments[5];
                    yield new PageImpl<>(pageItems);
                }
                case "toString" -> "PoolRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }

    private static final class EventPublisherDouble implements PoolEventPublisher {
        private final List<PoolUpsertFact> published = new ArrayList<>();

        @Override
        public void publishUpsert(PoolUpsertFact pool) {
            published.add(pool);
        }
    }
}
