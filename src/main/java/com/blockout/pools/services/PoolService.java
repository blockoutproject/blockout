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

    // Créer une nouvelle pool
    public Pool createPool(Pool pool) {
        return poolRepository.save(pool);
    }

    // Récupérer toutes les pools
    public List<Pool> getAllPools() {
        return poolRepository.findAll();
    }

    // Récupérer une pool par ID
    public Optional<Pool> getPoolById(Long id) {
        return poolRepository.findById(id);
    }

    // Mettre à jour une pool
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

    // Supprimer une pool
    public void deletePool(Long id) {
        poolRepository.deleteById(id);
    }
}