package com.blockout.pools.pool.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.pools.pool.persistence.JpaPoolStore;
import com.blockout.pools.pool.persistence.PoolEntity;
import com.blockout.pools.pool.persistence.PoolPersistenceMapper;
import com.blockout.pools.pool.persistence.PoolRepository;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class PoolLifecycleServiceTest {

    private final PoolPersistenceMapper mapper = Mappers.getMapper(PoolPersistenceMapper.class);

    @Test
    void repeatedDeactivationIsASuccessfulNoOpWithoutAnotherWriteOrEvent() {
        RepositoryDouble repository = new RepositoryDouble(pool(false));
        EventPublisherDouble publisher = new EventPublisherDouble();
        PoolLifecycleService service = service(repository, publisher);

        service.deactivate(1L);

        assertThat(repository.saveCalls).isZero();
        assertThat(publisher.projections).isEmpty();
    }

    @Test
    void effectiveDeactivationPublishesTheInactivePostFlushRevision() {
        RepositoryDouble repository = new RepositoryDouble(pool(true));
        EventPublisherDouble publisher = new EventPublisherDouble();
        PoolLifecycleService service = service(repository, publisher);

        service.deactivate(1L);

        assertThat(repository.saveCalls).isOne();
        assertThat(publisher.projections).containsExactly(new PoolEventData(
                1L, "Pool", "PL", 2L, "L1", "League", "2026",
                FormatEnum.SIX, GenderEnum.M, false, 4L));
    }

    private PoolLifecycleService service(RepositoryDouble repository, EventPublisherDouble publisher) {
        return new PoolLifecycleService(new JpaPoolStore(repository.proxy(), mapper), publisher);
    }

    private PoolEntity pool(boolean active) {
        return PoolEntity.builder()
                .id(1L)
                .poolCode("P1")
                .leagueCode("L1")
                .season("2026")
                .leagueName("League")
                .rawName("Raw")
                .name("Pool")
                .shortName("PL")
                .divisionId(2L)
                .format(FormatEnum.SIX)
                .gender(GenderEnum.M)
                .followersCount(0L)
                .active(active)
                .revision(3L)
                .build();
    }

    private static final class RepositoryDouble implements InvocationHandler {
        private final PoolEntity entity;
        private int saveCalls;

        private RepositoryDouble(PoolEntity entity) {
            this.entity = entity;
        }

        PoolRepository proxy() {
            return (PoolRepository) Proxy.newProxyInstance(
                    PoolRepository.class.getClassLoader(), new Class<?>[]{PoolRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findById" -> Optional.of(entity);
                case "save", "saveAndFlush" -> {
                    saveCalls++;
                    entity.setRevision(entity.getRevision() + 1);
                    yield entity;
                }
                case "toString" -> "PoolRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }

    private static final class EventPublisherDouble implements PoolEventPublisher {
        private final List<PoolEventData> projections = new ArrayList<>();

        @Override
        public void publishUpsert(PoolEventData pool) {
        }

        @Override
        public void publishProjection(PoolEventData pool) {
            projections.add(pool);
        }
    }
}
