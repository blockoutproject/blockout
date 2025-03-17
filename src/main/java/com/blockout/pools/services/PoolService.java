package com.blockout.pools.services;

import com.blockout.pools.exceptions.PoolNotFoundException;
import com.blockout.pools.models.Pool;
import com.blockout.pools.repositories.PoolRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.List;
import java.util.Optional;

@Service
public class PoolService {

    private static final Logger logger = LoggerFactory.getLogger(PoolService.class);

    @Autowired
    private PoolRepository poolRepository;

    /**
     * Crée une nouvelle pool
     * @param pool L'objet Pool à créer
     * @return La pool créée avec son ID généré
     */
    @Transactional
    public Pool createPool(Pool pool) {
        Pool createdPool = poolRepository.save(pool);
        logger.info("Pool created successfully",
                keyValue("action", "create_pool"),
                keyValue("poolId", createdPool.getId()));
        return createdPool;
    }

    /**
     * Récupère toutes les pools
     * @return Liste de toutes les pools
     */
    public List<Pool> getAllPools() {
        List<Pool> pools = poolRepository.findAll();
        return pools;
    }

    /**
     * Récupère les pools par ligue et saison
     * @param leagueCode Le code de la ligue
     * @param season La saison
     * @return Liste des pools correspondantes
     */
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

    /**
     * Récupère une pool par son ID
     * @param id L'identifiant de la pool
     * @return Optional contenant la pool si elle existe
     */
    public Optional<Pool> getPoolById(Long id) {
        Optional<Pool> poolOpt = poolRepository.findById(id);
        if (!poolOpt.isPresent()) {
            logger.warn("No pool found with given ID",
                    keyValue("action", "get_pool_by_id"),
                    keyValue("poolId", id));
        }
        return poolOpt;
    }

    /**
     * Met à jour une pool existante
     * @param id L'identifiant de la pool à mettre à jour
     * @param updatedPool Les nouvelles données de la pool
     * @return La pool mise à jour
     * @throws PoolNotFoundException Si la pool n'existe pas
     */
    @Transactional
    public Pool updatePool(Long id, Pool updatedPool) {
        return poolRepository.findById(id).map(pool -> {
            pool.setPoolCode(updatedPool.getPoolCode());
            pool.setLeagueCode(updatedPool.getLeagueCode());
            pool.setSeason(updatedPool.getSeason());
            pool.setLeagueName(updatedPool.getLeagueName());
            pool.setPoolName(updatedPool.getPoolName());
            pool.setDivisionCode(updatedPool.getDivisionCode());
            pool.setDivisionName(updatedPool.getDivisionName());
            pool.setFormat(updatedPool.getFormat());
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

    /**
     * Désactive une pool
     * @param poolId L'identifiant de la pool à désactiver
     * @return La pool désactivée
     * @throws PoolNotFoundException Si la pool n'existe pas
     */
    @Transactional
    public Pool deactivatePool(Long poolId) {
        return poolRepository.findById(poolId).map(pool -> {
            pool.setActive(false);
            Pool updatedPool = poolRepository.save(pool);

            logger.info("Pool successfully deactivated",
                    keyValue("action", "deactivate_pool"),
                    keyValue("poolId", poolId));

            return updatedPool;
        }).orElseThrow(() -> {
            logger.error("Pool not found. Cannot deactivate.",
                    keyValue("action", "deactivate_pool"),
                    keyValue("poolId", poolId));
            return new PoolNotFoundException(poolId);
        });
    }

    /**
     * Récupère une pool par code, ligue et saison
     * @param poolCode Le code de la pool
     * @param leagueCode Le code de la ligue
     * @param season La saison
     * @return Optional contenant la pool si elle existe
     */
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

    /**
     * Récupère les pools actives par code de ligue
     * @param leagueCode Le code de la ligue
     * @return Liste des pools actives correspondantes
     */
    public List<Pool> getActivePoolsByLeagueCode(String leagueCode) {
        List<Pool> pools = poolRepository.findByLeagueCodeAndActive(leagueCode, true);
        return pools;
    }
}