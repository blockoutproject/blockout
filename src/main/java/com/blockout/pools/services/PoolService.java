package com.blockout.pools.services;

import com.blockout.pools.models.Pool;
import com.blockout.pools.repositories.PoolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PoolService {

    @Autowired
    private PoolRepository poolRepository;

    public Pool createPool(Pool pool) {
        return poolRepository.save(pool);
    }

    public List<Pool> getAllPools() {
        return poolRepository.findAll();
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
        }).orElseThrow(() -> new RuntimeException("Pool not found with id " + id));
    }

    public void deletePool(Long id) {
        poolRepository.deleteById(id);
    }

    public Optional<Pool> getPoolByCodeAndLeagueAndSeason(String poolCode, String leagueCode, Integer season) {
        return poolRepository.findByPoolCodeAndLeagueCodeAndSeason(poolCode, leagueCode, season);
    }

    public List<Pool> getActivePoolsByLeagueCode(String leagueCode) {
        return poolRepository.findByLeagueCodeAndActive(leagueCode, true);
    }

    public boolean deactivatePool(Long poolId) {
        Optional<Pool> poolOpt = poolRepository.findById(poolId);
        if (poolOpt.isPresent()) {
            Pool pool = poolOpt.get();
            pool.setActive(false);
            poolRepository.save(pool);
            return true;
        }
        return false;
    }
}