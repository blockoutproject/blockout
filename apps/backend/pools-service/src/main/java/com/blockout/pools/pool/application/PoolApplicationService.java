package com.blockout.pools.pool.application;

import com.blockout.pools.pool.application.commands.CreatePoolCommand;
import com.blockout.pools.pool.application.commands.UpdatePoolCommand;
import com.blockout.pools.pool.application.exceptions.PoolNotFoundException;
import com.blockout.pools.pool.application.ports.PoolEventPublisher;
import com.blockout.pools.pool.application.views.PoolView;
import com.blockout.pools.pool.infrastructure.persistence.entities.PoolEntity;
import com.blockout.pools.pool.infrastructure.persistence.repositories.PoolRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Transactional application service for V1 pools.
 */
@Service
@RequiredArgsConstructor
public class PoolApplicationService implements PoolService {
    private static final Logger LOGGER = LoggerFactory.getLogger(PoolApplicationService.class);
    private final PoolRepository poolRepository;
    private final PoolEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public List<PoolView> findPools(String leagueCode, String season, Boolean active, List<Long> ids) {
        List<Long> safeIds = ids == null ? Collections.emptyList() : ids;
        return poolRepository.findFiltered(leagueCode, season, active, safeIds, safeIds.size()).stream()
            .map(this::toView).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PoolView getPoolById(Long id) {
        return toView(loadPool(id));
    }

    @Override
    @Transactional
    public PoolView createPool(CreatePoolCommand command) {
        PoolEntity pool = PoolEntity.builder()
            .poolCode(command.poolCode()).leagueCode(command.leagueCode()).season(command.season())
            .leagueName(command.leagueName()).rawName(command.rawName()).name(command.name())
            .shortName(command.shortName()).divisionId(command.divisionId()).format(command.format())
            .gender(command.gender()).followersCount(command.followersCount() == null ? 0L : command.followersCount())
            .active(command.active() == null ? true : command.active()).build();
        PoolView created = toView(poolRepository.saveAndFlush(pool));
        eventPublisher.publishPoolUpsert(created);
        LOGGER.info("Created pool", keyValue("action", "create_pool"), keyValue("poolId", created.id()));
        return created;
    }

    @Override
    @Transactional
    public PoolView updatePool(Long id, UpdatePoolCommand command) {
        PoolEntity pool = loadPool(id);
        if (command.poolCode() != null) pool.setPoolCode(command.poolCode());
        if (command.leagueCode() != null) pool.setLeagueCode(command.leagueCode());
        if (command.season() != null) pool.setSeason(command.season());
        if (command.leagueName() != null) pool.setLeagueName(command.leagueName());
        if (command.rawName() != null) pool.setRawName(command.rawName());
        if (command.name() != null) pool.setName(command.name());
        if (command.shortName() != null) pool.setShortName(command.shortName());
        if (command.divisionId() != null) pool.setDivisionId(command.divisionId());
        if (command.format() != null) pool.setFormat(command.format());
        if (command.gender() != null) pool.setGender(command.gender());
        if (command.active() != null) pool.setActive(command.active());
        PoolView updated = toView(poolRepository.saveAndFlush(pool));
        eventPublisher.publishPoolUpsert(updated);
        LOGGER.info("Updated pool", keyValue("action", "update_pool"), keyValue("poolId", id));
        return updated;
    }

    @Override
    @Transactional
    public void deactivatePool(Long id) {
        PoolEntity pool = loadPool(id);
        pool.setActive(false);
        poolRepository.saveAndFlush(pool);
        LOGGER.info("Deactivated pool", keyValue("action", "deactivate_pool"), keyValue("poolId", id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PoolView> getActivePoolsByLeagueCode(String leagueCode) {
        return poolRepository.findByLeagueCodeAndActive(leagueCode, true).stream().map(this::toView).toList();
    }

    @Override
    @Transactional
    public PoolView incrementFollowersCount(Long poolId, Long userId) {
        PoolEntity pool = loadPool(poolId);
        pool.setFollowersCount(pool.getFollowersCount() + 1L);
        return toView(poolRepository.saveAndFlush(pool));
    }

    @Override
    @Transactional
    public PoolView decrementFollowersCount(Long poolId, Long userId) {
        PoolEntity pool = loadPool(poolId);
        pool.setFollowersCount(Math.max(0L, pool.getFollowersCount() - 1L));
        return toView(poolRepository.saveAndFlush(pool));
    }

    private PoolEntity loadPool(Long id) {
        return poolRepository.findById(id).orElseThrow(() -> new PoolNotFoundException(id));
    }

    private PoolView toView(PoolEntity pool) {
        return new PoolView(pool.getId(), pool.getPoolCode(), pool.getLeagueCode(), pool.getSeason(), pool.getLeagueName(),
            pool.getRawName(), pool.getName(), pool.getShortName(), pool.getDivisionId(), pool.getFormat(),
            pool.getGender(), pool.getFollowersCount(), pool.getActive(), pool.getCreatedAt(), pool.getLastUpdate());
    }
}
