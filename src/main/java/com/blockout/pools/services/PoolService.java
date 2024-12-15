package com.blockout.pools.services;

import com.blockout.pools.exceptions.PoolNotFoundException;
import com.blockout.pools.models.Pool;
import com.blockout.pools.repositories.PoolRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.List;
import java.util.Optional;

@Service
public class PoolService {

    private static final Logger logger = LoggerFactory.getLogger(PoolService.class);

    @Autowired
    private PoolRepository poolRepository;

    @Autowired
    private EventPublisher eventPublisher;

    public Pool createPool(Pool pool) {
        Pool createdPool = poolRepository.save(pool);
        logger.info("Pool created successfully",
                keyValue("action", "create_pool"),
                keyValue("poolId", createdPool.getId()));
        return createdPool;
    }

    public List<Pool> getAllPools() {
        List<Pool> pools = poolRepository.findAll();
        return pools;
    }

    public List<Pool> getPoolsByLeagueAndSeason(String leagueCode, Integer season) {
        List<Pool> pools = poolRepository.findByLeagueCodeAndSeason(leagueCode, season);
        if (pools.isEmpty()) {
            logger.warn("No pools found for leagueCode and season",
                    keyValue("action", "get_pools_by_league_and_season"),
                    keyValue("leagueCode", leagueCode),
                    keyValue("season", season));
        }
        return pools;
    }

    public Optional<Pool> getPoolById(Long id) {
        Optional<Pool> poolOpt = poolRepository.findById(id);
        if (!poolOpt.isPresent()) {
            logger.warn("No pool found with given ID",
                    keyValue("action", "get_pool_by_id"),
                    keyValue("poolId", id));
        }
        return poolOpt;
    }

    public Pool updatePool(Long id, Pool updatedPool) {
        return poolRepository.findById(id).map(pool -> {
            pool.setPoolCode(updatedPool.getPoolCode());
            pool.setLeagueCode(updatedPool.getLeagueCode());
            pool.setSeason(updatedPool.getSeason());
            pool.setLeagueName(updatedPool.getLeagueName());
            pool.setPoolName(updatedPool.getPoolName());
            pool.setDivisionCode(updatedPool.getDivisionCode());
            pool.setDivisionName(updatedPool.getDivisionName());
            pool.setGender(updatedPool.getGender());
            pool.setRawDivisionName(updatedPool.getRawDivisionName());
            pool.setActive(updatedPool.getActive());
            Pool savedPool = poolRepository.save(pool);

            logger.info("Pool updated successfully",
                    keyValue("action", "update_pool"),
                    keyValue("poolId", savedPool.getId()));
            return savedPool;
        }).orElseThrow(() -> {
            logger.error("Pool not found, cannot update",
                    keyValue("action", "update_pool"),
                    keyValue("poolId", id));
            return new PoolNotFoundException(id);
        });
    }

    public Pool deactivatePool(Long poolId) {
        return poolRepository.findById(poolId).map(pool -> {
            pool.setActive(false);
            Pool updatedPool = poolRepository.save(pool);

            logger.info("Pool successfully deactivated",
                    keyValue("action", "deactivate_pool"),
                    keyValue("poolId", poolId));

            // Publier l'événement de désactivation
            eventPublisher.publishPoolDeactivationEvent(poolId);

            return updatedPool;
        }).orElseThrow(() -> {
            logger.error("Pool not found. Cannot deactivate.",
                    keyValue("action", "deactivate_pool"),
                    keyValue("poolId", poolId));
            return new PoolNotFoundException(poolId);
        });
    }

    public Optional<Pool> getPoolByCodeAndLeagueAndSeason(String poolCode, String leagueCode, Integer season) {
        Optional<Pool> poolOpt = poolRepository.findByPoolCodeAndLeagueCodeAndSeason(poolCode, leagueCode, season);
        if (!poolOpt.isPresent()) {
            logger.warn("No pool found for given code, league and season",
                    keyValue("action", "get_pool_by_code_league_season"),
                    keyValue("poolCode", poolCode),
                    keyValue("leagueCode", leagueCode),
                    keyValue("season", season));
        }
        return poolOpt;
    }

    public List<Pool> getActivePoolsByLeagueCode(String leagueCode) {
        List<Pool> pools = poolRepository.findByLeagueCodeAndActive(leagueCode, true);
        return pools;
    }
}