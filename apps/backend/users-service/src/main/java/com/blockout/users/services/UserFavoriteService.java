package com.blockout.users.services;

import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.favorite.application.PoolFollowerProjection;
import com.blockout.users.favorite.application.TeamFollowerProjection;
import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.models.entities.UserFavorite;
import com.blockout.users.models.enums.EntityType;
import com.blockout.users.models.enums.EventType;
import com.blockout.users.repositories.UserFavoriteRepository;
import com.blockout.users.repositories.UserRepository;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UserFavoriteService {

    private static final Logger logger = LoggerFactory.getLogger(UserFavoriteService.class);

    private final UserFavoriteRepository userFavoriteRepository;
    private final UserRepository userRepository;
    private final EventPublisher eventPublisher;
    private final TeamFollowerProjection teamFollowerProjection;
    private final PoolFollowerProjection poolFollowerProjection;

    /**
     * Permet à un utilisateur de suivre une entité.
     *
     * @param auth0Id    Identifiant Auth0 de l'utilisateur
     * @param entityType Type d'entité à suivre (POOL, TEAM, etc.)
     * @param entityId   Identifiant de l'entité à suivre
     * @throws CustomUserNotFoundException si l'utilisateur n'existe pas
     */
    @Transactional
    public void follow(String auth0Id, EntityType entityType, Long entityId) {
        CustomUser user = userRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> {
                    logger.error("Utilisateur introuvable pour follow",
                            keyValue("auth0Id", auth0Id),
                            keyValue("entityType", entityType),
                            keyValue("entityId", entityId));
                    return new CustomUserNotFoundException(auth0Id);
                });

        boolean alreadyFollowed = userFavoriteRepository
                .existsByUserAndEntityTypeAndEntityId(user, entityType, entityId);

        if (alreadyFollowed) {
            logger.info("Suivi déjà existant",
                    keyValue("userId", user.getId()),
                    keyValue("entityType", entityType),
                    keyValue("entityId", entityId));
            return;
        }

        UserFavorite favorite = UserFavorite.builder()
                .user(user)
                .entityType(entityType)
                .entityId(entityId)
                .build();

        UserFavorite saved = userFavoriteRepository.save(favorite);

        logger.info("Suivi enregistré",
                keyValue("userId", user.getId()),
                keyValue("entityType", entityType),
                keyValue("entityId", entityId),
                keyValue("favoriteId", saved.getId()));

        if (entityType == EntityType.TEAM) {
            teamFollowerProjection.increment(entityId, user.getId());
        }

        if (entityType == EntityType.POOL) {
            poolFollowerProjection.increment(entityId, user.getId());
        }

        eventPublisher.publishFollowEvent(user.getId(), entityType, entityId, EventType.CREATED);
    }

    /**
     * Permet à un utilisateur d'arrêter de suivre une entité.
     *
     * @param auth0Id    Identifiant Auth0 de l'utilisateur
     * @param entityType Type d'entité suivie
     * @param entityId   Identifiant de l'entité suivie
     * @throws CustomUserNotFoundException si l'utilisateur n'existe pas
     */
    @Transactional
    public void unfollow(String auth0Id, EntityType entityType, Long entityId) {
        CustomUser user = userRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> {
                    logger.error("Utilisateur introuvable pour unfollow",
                            keyValue("auth0Id", auth0Id),
                            keyValue("entityType", entityType),
                            keyValue("entityId", entityId));
                    return new CustomUserNotFoundException(auth0Id);
                });

        int deleted = userFavoriteRepository
                .deleteByUserAndEntityTypeAndEntityId(user, entityType, entityId);

        if (deleted > 0) {
            logger.info("Suivi supprimé",
                    keyValue("userId", user.getId()),
                    keyValue("entityType", entityType),
                    keyValue("entityId", entityId));

            if (entityType == EntityType.TEAM) {
                teamFollowerProjection.decrement(entityId, user.getId());
            }

            if (entityType == EntityType.POOL) {
                poolFollowerProjection.decrement(entityId, user.getId());
            }

            eventPublisher.publishFollowEvent(user.getId(), entityType, entityId, EventType.DELETED);
        }
    }

    /**
     * Récupère tous les favoris d’un utilisateur.
     *
     * @param userId Identifiant de l'utilisateur
     * @return Liste des entités suivies
     * @throws CustomUserNotFoundException si l'utilisateur n'existe pas
     */
    public List<UserFavorite> getUserFavorites(Long userId) {
        if (!userRepository.existsById(userId)) {
            logger.error("Utilisateur introuvable lors de la récupération des favoris",
                    keyValue("userId", userId));
            throw new CustomUserNotFoundException(userId.toString());
        }

        List<UserFavorite> favorites = userFavoriteRepository.findByUserId(userId);
        logger.info("Favoris récupérés", keyValue("userId", userId), keyValue("count", favorites.size()));
        return favorites;
    }

    /**
     * Récupère les favoris d’un utilisateur filtrés par type d’entité.
     *
     * @param userId     Identifiant de l'utilisateur
     * @param entityType Type d'entité (POOL, TEAM, etc.)
     * @return Liste des entités suivies du type donné
     * @throws CustomUserNotFoundException si l'utilisateur n'existe pas
     */
    public List<UserFavorite> getUserFavoritesByType(Long userId, EntityType entityType) {
        if (!userRepository.existsById(userId)) {
            logger.error("Utilisateur introuvable lors de la récupération des favoris par type",
                    keyValue("userId", userId),
                    keyValue("entityType", entityType));
            throw new CustomUserNotFoundException(userId.toString());
        }

        List<UserFavorite> favorites = userFavoriteRepository.findByUserIdAndEntityType(userId, entityType);
        logger.info("Favoris par type récupérés",
                keyValue("userId", userId),
                keyValue("entityType", entityType),
                keyValue("count", favorites.size()));
        return favorites;
    }
}
