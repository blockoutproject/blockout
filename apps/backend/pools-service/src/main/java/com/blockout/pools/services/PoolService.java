package com.blockout.pools.services;

import com.blockout.pools.exceptions.PoolNotFoundException;
import com.blockout.pools.models.Pool;
import com.blockout.pools.models.dto.PoolUpdateDTO;
import com.blockout.pools.repositories.PoolRepository;
import com.blockout.pools.utils.DiffUtils;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PoolService {

    private static final Logger logger = LoggerFactory.getLogger(PoolService.class);

    private final PoolRepository poolRepository;
    private final EventPublisher eventPublisher;

    /**
     * Crée une nouvelle pool
     *
     * @param pool L'objet Pool à créer
     * @return La pool créée avec son ID généré
     */
    @Transactional
    public Pool createPool(Pool pool) {
        Pool created = poolRepository.save(pool);
        logger.info("Pool created successfully",
                keyValue("action", "create_pool"),
                keyValue("poolId", created.getId()));
        eventPublisher.publishPoolUpsert(created);
        return created;
    }

    /**
     * Récupère les pools en appliquant des filtres facultatifs
     *
     * @param leagueCode code de la ligue (null pour ignorer)
     * @param season     saison (null pour ignorer)
     * @param active     état d’activation (null pour ignorer)
     * @param ids        liste d'IDs spécifiques (null pour ignorer)
     * @return liste des pools correspondant aux critères
     */
    public List<Pool> findPools(String leagueCode, String season, Boolean active, List<Long> ids) {
        List<Long> safeIds = (ids == null) ? Collections.emptyList() : ids;
        return poolRepository.findFiltered(leagueCode, season, active, safeIds, safeIds.size());
    }

    /**
     * Récupère une pool par son ID
     *
     * @param id L'identifiant de la pool
     * @return La pool si elle existe
     * @throws PoolNotFoundException si la pool est introuvable
     */
    public Pool getPoolById(Long id) {
        return poolRepository.findById(id).orElseThrow(() -> {
            logger.warn("Pool not found", keyValue("action", "get_pool_by_id"), keyValue("poolId", id));
            return new PoolNotFoundException(id);
        });
    }

    /**
     * Met à jour une pool existante
     *
     * @param id  L'identifiant de la pool à mettre à jour
     * @param dto Les nouvelles données (tous les champs optionnels)
     * @return La pool mise à jour
     * @throws PoolNotFoundException si la pool n'existe pas
     */
    @Transactional
    public Pool updatePool(Long id, PoolUpdateDTO dto) {
        return poolRepository.findById(id).map(pool -> {
            Pool before = pool.toBuilder().build();

            if (dto.getPoolCode() != null)
                pool.setPoolCode(dto.getPoolCode());
            if (dto.getLeagueCode() != null)
                pool.setLeagueCode(dto.getLeagueCode());
            if (dto.getSeason() != null)
                pool.setSeason(dto.getSeason());
            if (dto.getLeagueName() != null)
                pool.setLeagueName(dto.getLeagueName());
            if (dto.getRawName() != null)
                pool.setRawName(dto.getRawName());
            if (dto.getName() != null)
                pool.setName(dto.getName());
            if (dto.getShortName() != null)
                pool.setShortName(dto.getShortName());
            if (dto.getDivisionId() != null)
                pool.setDivisionId(dto.getDivisionId());
            if (dto.getFormat() != null)
                pool.setFormat(dto.getFormat());
            if (dto.getGender() != null)
                pool.setGender(dto.getGender());
            if (dto.getActive() != null)
                pool.setActive(dto.getActive());

            if (!Boolean.TRUE.equals(before.getActive()) && Boolean.TRUE.equals(pool.getActive())) {
                logger.info("Pool réactivée",
                        keyValue("action", "reactivate_pool"),
                        keyValue("poolId", id),
                        keyValue("league_code", pool.getLeagueCode()),
                        keyValue("name", pool.getName()));
            }

            Pool saved = poolRepository.save(pool);

            DiffUtils.logChanges(before, saved, logger, "update_pool", saved.getId());
            eventPublisher.publishPoolUpsert(saved);

            return saved;
        }).orElseThrow(() -> {
            logger.error("Pool not found. Cannot update.",
                    keyValue("action", "update_pool"),
                    keyValue("poolId", id));
            return new PoolNotFoundException(id);
        });
    }

    /**
     * Désactive une pool
     *
     * @param id L'identifiant de la pool à désactiver
     * @return La pool désactivée
     * @throws PoolNotFoundException si la pool n'existe pas
     */
    @Transactional
    public Pool deactivatePool(Long id) {
        return poolRepository.findById(id).map(pool -> {
            pool.setActive(false);
            Pool updated = poolRepository.save(pool);

            logger.info("Pool successfully deactivated",
                    keyValue("action", "deactivate_pool"),
                    keyValue("poolId", id));
            return updated;
        }).orElseThrow(() -> {
            logger.error("Pool not found. Cannot deactivate.",
                    keyValue("action", "deactivate_pool"),
                    keyValue("poolId", id));
            return new PoolNotFoundException(id);
        });
    }

    /**
     * Récupère les pools actives par code de ligue
     *
     * @param leagueCode Le code de la ligue
     * @return Liste des pools actives correspondantes
     */
    public List<Pool> getActivePoolsByLeagueCode(String leagueCode) {
        return poolRepository.findByLeagueCodeAndActive(leagueCode, true);
    }

    /**
     * Incrémente le compteur de followers pour une pool
     *
     * @param poolId Identifiant de la pool
     * @param userId Identifiant de l'utilisateur
     * @return La pool mise à jour
     * @throws PoolNotFoundException si la pool n'existe pas
     */
    @Transactional
    public Pool incrementFollowersCount(Long poolId, Long userId) {
        return poolRepository.findById(poolId).map(pool -> {
            pool.setFollowersCount(pool.getFollowersCount() + 1);
            Pool updated = poolRepository.save(pool);
            logger.info("Pool followers incremented",
                    keyValue("action", "increment_followers_count"),
                    keyValue("poolId", poolId),
                    keyValue("userId", userId),
                    keyValue("newFollowersCount", updated.getFollowersCount()));
            return updated;
        }).orElseThrow(() -> {
            logger.error("Pool not found. Cannot increment followers count.",
                    keyValue("action", "increment_followers_count"),
                    keyValue("poolId", poolId),
                    keyValue("userId", userId));
            return new PoolNotFoundException(poolId);
        });
    }

    /**
     * Décrémente le compteur de followers pour une pool
     *
     * @param poolId Identifiant de la pool
     * @param userId Identifiant de l'utilisateur
     * @return La pool mise à jour
     * @throws PoolNotFoundException si la pool n'existe pas
     */
    @Transactional
    public Pool decrementFollowersCount(Long poolId, Long userId) {
        return poolRepository.findById(poolId).map(pool -> {
            long newCount = Math.max(0, pool.getFollowersCount() - 1);
            pool.setFollowersCount(newCount);
            Pool updated = poolRepository.save(pool);
            logger.info("Pool followers decremented",
                    keyValue("action", "decrement_followers_count"),
                    keyValue("poolId", poolId),
                    keyValue("userId", userId),
                    keyValue("newFollowersCount", updated.getFollowersCount()));
            return updated;
        }).orElseThrow(() -> {
            logger.error("Pool not found. Cannot decrement followers count.",
                    keyValue("action", "decrement_followers_count"),
                    keyValue("poolId", poolId),
                    keyValue("userId", userId));
            return new PoolNotFoundException(poolId);
        });
    }
}