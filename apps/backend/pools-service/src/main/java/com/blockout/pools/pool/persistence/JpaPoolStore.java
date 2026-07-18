package com.blockout.pools.pool.persistence;

import com.blockout.shared.model.FollowerCountDeltaEnum;
import com.blockout.pools.pool.application.CreatePoolCommand;
import com.blockout.pools.pool.application.LegacyCreatePoolCommand;
import com.blockout.pools.pool.application.PoolChange;
import com.blockout.pools.pool.application.PoolFilter;
import com.blockout.pools.pool.application.PoolFollowerCommand;
import com.blockout.pools.pool.application.PoolFollowerStore;
import com.blockout.pools.pool.application.PoolLifecycleStore;
import com.blockout.pools.pool.application.PoolPage;
import com.blockout.pools.pool.application.PoolStore;
import com.blockout.pools.pool.application.PoolUpdate;
import com.blockout.pools.pool.application.PoolUpdatePlan;
import com.blockout.pools.pool.application.PoolView;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaPoolStore implements PoolStore, PoolFollowerStore, PoolLifecycleStore {
    private final PoolRepository repository;
    private final PoolPersistenceMapper mapper;

    @Override
    public PoolView create(CreatePoolCommand command) {
        PoolEntity entity = mapper.toEntity(command);
        entity.setFollowersCount(0L);
        entity.setActive(true);
        return mapper.toView(repository.save(entity));
    }

    @Override
    public PoolView createLegacy(LegacyCreatePoolCommand command) {
        return mapper.toView(repository.save(mapper.toEntity(command)));
    }

    @Override
    public Optional<PoolView> findById(Long id) {
        return repository.findById(id).map(mapper::toView);
    }

    @Override
    public List<PoolView> findLegacy(PoolFilter filter) {
        return repository.findFilteredLegacy(filter.leagueCode(), filter.season(), filter.active(), filter.ids(),
                        filter.ids().size())
                .stream().map(mapper::toView).toList();
    }

    @Override
    public PoolPage findPage(PoolFilter filter, int page, int pageSize) {
        Sort sort = Sort.by(Sort.Order.desc("season"), Sort.Order.asc("name").nullsLast(), Sort.Order.asc("id"));
        Page<PoolEntity> result = repository.findFiltered(filter.leagueCode(), filter.season(), filter.active(),
                filter.ids(), filter.ids().size(), PageRequest.of(page, pageSize, sort));
        return new PoolPage(result.getContent().stream().map(mapper::toView).toList(), page, pageSize,
                result.getTotalElements(), result.hasNext());
    }

    @Override
    public Optional<PoolUpdate> findForUpdate(Long id) {
        return repository.findById(id).map(JpaPoolUpdate::new);
    }

    @Override
    public Optional<PoolView> updateFollowers(PoolFollowerCommand command) {
        return repository.findById(command.poolId()).map(entity -> {
            long current = entity.getFollowersCount();
            entity.setFollowersCount(command.delta() == FollowerCountDeltaEnum.INCREMENT
                    ? current + 1 : Math.max(0, current - 1));
            return mapper.toView(repository.save(entity));
        });
    }

    @Override
    public boolean deactivate(Long id) {
        return repository.findById(id).map(entity -> {
            entity.setActive(false);
            repository.save(entity);
            return true;
        }).orElse(false);
    }

    private final class JpaPoolUpdate implements PoolUpdate {
        private final PoolEntity entity;

        private JpaPoolUpdate(PoolEntity entity) {
            this.entity = entity;
        }

        @Override
        public PoolView current() {
            return mapper.toView(entity);
        }

        @Override
        public PoolChange apply(PoolUpdatePlan plan) {
            PoolView before = current();
            mapper.apply(plan.command(), entity);
            return new PoolChange(before, mapper.toView(repository.save(entity)));
        }
    }
}
