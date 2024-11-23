package com.blockout.pools.services;

import com.blockout.pools.exceptions.PoolNotFoundException;
import com.blockout.pools.models.Pool;
import com.blockout.pools.repositories.PoolRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
        return poolRepository.save(pool);
    }

    public List<Pool> getAllPools() {
        return poolRepository.findAll();
    }

    public List<Pool> getPoolsByLeagueAndSeason(String leagueCode, Integer season) {
        return poolRepository.findByLeagueCodeAndSeason(leagueCode, season);
    }

    public Optional<Pool> getPoolById(Long id) {
        return poolRepository.findById(id);
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
            return poolRepository.save(pool);
        }).orElseThrow(() -> new PoolNotFoundException(id));
    }

    public Pool deactivatePool(Long poolId) {
        return poolRepository.findById(poolId).map(pool -> {
            pool.setActive(false);
            Pool updatedPool = poolRepository.save(pool);
            logger.info("Pool with ID: {} successfully deactivated", poolId);

            // Publier l'événement de désactivation
            eventPublisher.publishPoolDeactivationEvent(poolId);

            return updatedPool;
        }).orElseThrow(() -> {
            logger.error("Pool with ID: {} not found. Cannot deactivate.", poolId);
            return new PoolNotFoundException(poolId);
        });
    }

    public Optional<Pool> getPoolByCodeAndLeagueAndSeason(String poolCode, String leagueCode, Integer season) {
        return poolRepository.findByPoolCodeAndLeagueCodeAndSeason(poolCode, leagueCode, season);
    }

    public List<Pool> getActivePoolsByLeagueCode(String leagueCode) {
        return poolRepository.findByLeagueCodeAndActive(leagueCode, true);
    }
}