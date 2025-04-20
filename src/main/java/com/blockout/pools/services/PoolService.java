package com.blockout.pools.services;

import com.blockout.pools.exceptions.PoolNotFoundException;
import com.blockout.pools.models.Pool;
import com.blockout.pools.repositories.PoolRepository;
import com.blockout.pools.utils.DiffUtils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.List;
import java.util.Optional;

@Service
public class PoolService {

    private static final Logger logger = LoggerFactory.getLogger(PoolService.class);

    private final PoolRepository poolRepository;

    public PoolService(PoolRepository poolRepository) {
        this.poolRepository = poolRepository;
    }

    /**
     * Crée une nouvelle pool
     * 
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
     * Récupère les pools en appliquant des filtres facultatifs.
     *
     * @param leagueCode code de la ligue (null pour ignorer)
     * @param season     saison (null pour ignorer)
     * @param active     état d’activation (null pour ignorer)
     * @param poolCode   code de la pool (null pour ignorer)
     * @return liste des pools correspondant aux critères
     */
    public List<Pool> findPools(String leagueCode,
            Integer season,
            Boolean active) {

        List<Pool> pools = poolRepository.findFiltered(
                leagueCode,
                season,
                active);

        logger.debug("findPools executed",
                keyValue("action", "find_pools"),
                keyValue("leagueCode", leagueCode),
                keyValue("season", season),
                keyValue("active", active),
                keyValue("resultCount", pools.size()));

        return pools;
    }

    /**
     * Récupère une pool par son ID
     * 
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
     *
     * @param id          L'identifiant de la pool à mettre à jour
     * @param updatedPool Les nouvelles données de la pool
     * @return La pool mise à jour
     * @throws PoolNotFoundException Si la pool n'existe pas
     */
    @Transactional
    public Optional<Pool> updatePool(Long id, Pool updatedPool) {
        return poolRepository.findById(id).map(pool -> {
            Pool before = pool.toBuilder().build();

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

            if (!before.getActive() && pool.getActive()) {
                logger.info("Pool réactivée",
                        keyValue("action", "reactivate_pool"),
                        keyValue("poolId", id),
                        keyValue("league_code", updatedPool.getLeagueCode()),
                        keyValue("pool_name", updatedPool.getPoolName()));
            }

            Pool savedPool = poolRepository.save(pool);

            DiffUtils.logChanges(before, savedPool, logger,
                    "update_pool", savedPool.getId());
            return savedPool;
        });
    }

    /**
     * Désactive une pool
     * 
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
     * Récupère les pools actives par code de ligue
     * 
     * @param leagueCode Le code de la ligue
     * @return Liste des pools actives correspondantes
     */
    public List<Pool> getActivePoolsByLeagueCode(String leagueCode) {
        List<Pool> pools = poolRepository.findByLeagueCodeAndActive(leagueCode, true);
        return pools;
    }

    /**
     * Incrémente le compteur de followers pour la poule.
     * 
     * @param poolId Identifiant de la pool
     * @param userId Identifiant de l'utilisateur qui follow
     * @return La poule mise à jour
     * @throws PoolNotFoundException Si la poule n'existe pas
     */
    @Transactional
    public Pool incrementFollowersCount(Long poolId, Long userId) {
        return poolRepository.findById(poolId).map(pool -> {
            long currentCount = pool.getFollowersCount();
            pool.setFollowersCount(currentCount + 1);

            Pool updatedPool = poolRepository.save(pool);
            logger.info("Pool followers count incremented",
                    keyValue("action", "increment_followers_count"),
                    keyValue("poolId", poolId),
                    keyValue("userId", userId),
                    keyValue("newFollowersCount", updatedPool.getFollowersCount()));

            return updatedPool;
        }).orElseThrow(() -> {
            logger.error("Pool not found. Cannot increment followers count.",
                    keyValue("action", "increment_followers_count"),
                    keyValue("poolId", poolId),
                    keyValue("userId", userId));
            return new PoolNotFoundException(poolId);
        });
    }

    /**
     * Décrémente le compteur de followers pour la poule.
     * 
     * @param poolId Identifiant de la poule
     * @param userId Identifiant de l'utilisateur qui unfollow
     * @return La poule mise à jour
     * @throws PoolNotFoundException Si la poule n'existe pas
     */
    @Transactional
    public Pool decrementFollowersCount(Long poolId, Long userId) {
        return poolRepository.findById(poolId).map(pool -> {
            long currentCount = pool.getFollowersCount();
            long newCount = (currentCount > 0) ? currentCount - 1 : 0;
            pool.setFollowersCount(newCount);

            Pool updatedPool = poolRepository.save(pool);
            logger.info("Pool followers count decremented",
                    keyValue("action", "decrement_followers_count"),
                    keyValue("poolId", poolId),
                    keyValue("userId", userId),
                    keyValue("newFollowersCount", updatedPool.getFollowersCount()));

            return updatedPool;
        }).orElseThrow(() -> {
            logger.error("Pool not found. Cannot decrement followers count.",
                    keyValue("action", "decrement_followers_count"),
                    keyValue("poolId", poolId),
                    keyValue("userId", userId));
            return new PoolNotFoundException(poolId);
        });
    }
}