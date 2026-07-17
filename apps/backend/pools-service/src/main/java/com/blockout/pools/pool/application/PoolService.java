package com.blockout.pools.pool.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.pools.exceptions.PoolNotFoundException;
import com.blockout.pools.pool.persistence.PoolEntity;
import com.blockout.pools.pool.persistence.PoolPersistenceMapper;
import com.blockout.pools.pool.persistence.PoolRepository;
import com.blockout.pools.utils.DiffUtils;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PoolService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PoolService.class);

    private final PoolRepository repository;
    private final PoolPersistenceMapper mapper;
    private final PoolEventPublisher eventPublisher;

    @Transactional
    public PoolView create(CreatePoolCommand command) {
        PoolEntity entity = mapper.toEntity(command);
        entity.setFollowersCount(0L);
        entity.setActive(true);
        return saveCreated(entity);
    }

    @Transactional
    public PoolView createLegacy(LegacyCreatePoolCommand command) {
        return saveCreated(mapper.toEntity(command));
    }

    @Transactional(readOnly = true)
    public PoolView getById(Long id) {
        return mapper.toView(findEntity(id));
    }

    @Transactional(readOnly = true)
    public List<PoolView> findLegacy(PoolFilter filter) {
        return repository.findFilteredLegacy(filter.leagueCode(), filter.season(), filter.active(), filter.ids(),
                        filter.ids().size())
                .stream().map(mapper::toView).toList();
    }

    @Transactional(readOnly = true)
    public PoolPage findPage(PoolFilter filter, int page, int pageSize) {
        Sort sort = Sort.by(Sort.Order.desc("season"), Sort.Order.asc("name").nullsLast(), Sort.Order.asc("id"));
        Page<PoolEntity> result = repository.findFiltered(filter.leagueCode(), filter.season(), filter.active(),
                filter.ids(), filter.ids().size(), PageRequest.of(page, pageSize, sort));
        return new PoolPage(result.getContent().stream().map(mapper::toView).toList(), page, pageSize,
                result.getTotalElements(), result.hasNext());
    }

    @Transactional
    public PoolView update(Long id, UpdatePoolCommand command) {
        PoolEntity entity = findEntity(id);
        PoolEntity before = entity.toBuilder().build();
        mapper.apply(command, entity);
        if (Boolean.FALSE.equals(before.getActive()) && Boolean.TRUE.equals(entity.getActive())) {
            LOGGER.info("Pool reactivated", keyValue("action", "reactivate_pool"), keyValue("poolId", id),
                    keyValue("leagueCode", entity.getLeagueCode()), keyValue("name", entity.getName()));
        }
        PoolEntity saved = repository.save(entity);
        PoolView view = mapper.toView(saved);
        DiffUtils.logChanges(before, saved, LOGGER, "update_pool", saved.getId());
        eventPublisher.publishUpsert(view);
        return view;
    }

    @Transactional
    public void deactivate(Long id) {
        PoolEntity entity = findEntity(id);
        entity.setActive(false);
        repository.save(entity);
        LOGGER.info("Pool successfully deactivated", keyValue("action", "deactivate_pool"), keyValue("poolId", id));
    }

    @Transactional
    public PoolView updateFollowers(PoolFollowerCommand command) {
        PoolEntity entity = findEntity(command.poolId());
        if (command.delta() == PoolFollowerCommand.Delta.INCREMENT) {
            entity.setFollowersCount(entity.getFollowersCount() + 1);
        } else {
            entity.setFollowersCount(Math.max(0, entity.getFollowersCount() - 1));
        }
        PoolEntity saved = repository.save(entity);
        String action = command.delta() == PoolFollowerCommand.Delta.INCREMENT
                ? "increment_followers_count" : "decrement_followers_count";
        LOGGER.info("Pool followers projection updated", keyValue("action", action),
                keyValue("poolId", command.poolId()), keyValue("userId", command.userId()),
                keyValue("newFollowersCount", saved.getFollowersCount()));
        return mapper.toView(saved);
    }

    private PoolView saveCreated(PoolEntity entity) {
        PoolEntity saved = repository.save(entity);
        PoolView view = mapper.toView(saved);
        LOGGER.info("Pool created successfully", keyValue("action", "create_pool"), keyValue("poolId", saved.getId()));
        eventPublisher.publishUpsert(view);
        return view;
    }

    private PoolEntity findEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> {
            LOGGER.warn("Pool not found", keyValue("action", "get_pool_by_id"), keyValue("poolId", id));
            return new PoolNotFoundException(id);
        });
    }
}
