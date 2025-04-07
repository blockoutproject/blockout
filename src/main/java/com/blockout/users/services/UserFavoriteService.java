package com.blockout.users.services;

import com.blockout.shared.events.UserFollowEvent.EventType;
import com.blockout.users.models.CustomUser;
import com.blockout.users.models.EntityType;
import com.blockout.users.models.UserFavorite;
import com.blockout.users.repositories.UserFavoriteRepository;
import com.blockout.users.repositories.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
public class UserFavoriteService {

    private static final Logger logger = LoggerFactory.getLogger(UserFavoriteService.class);

    private final UserFavoriteRepository userFavoriteRepository;
    private final UserRepository userRepository;
    private final EventPublisher eventPublisher;

    public UserFavoriteService(
            UserFavoriteRepository userFavoriteRepository,
            UserRepository userRepository,
            EventPublisher eventPublisher) {
        this.userFavoriteRepository = userFavoriteRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void follow(String auth0Id, EntityType entityType, Long entityId) {
        CustomUser user = userRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> {
                    logger.error("User not found when trying to follow entity",
                            keyValue("action", "follow"),
                            keyValue("auth0Id", auth0Id),
                            keyValue("entityType", entityType),
                            keyValue("entityId", entityId));
                    return new IllegalArgumentException("Utilisateur inexistant (id=" + auth0Id + ")");
                });

        Long userId = user.getId();

        boolean alreadyFollowed = userFavoriteRepository
                .findByUserAndEntityTypeAndEntityId(user, entityType, entityId)
                .isPresent();

        if (alreadyFollowed) {
            logger.info("Follow already exists",
                    keyValue("action", "follow"),
                    keyValue("userId", userId),
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

        logger.info("Follow created successfully",
                keyValue("action", "follow"),
                keyValue("userId", userId),
                keyValue("entityType", entityType),
                keyValue("entityId", entityId),
                keyValue("favoriteId", saved.getId()));

        eventPublisher.publishFollowEvent(userId, entityType, entityId, EventType.CREATED);
    }

    @Transactional
    public void unfollow(String auth0Id, EntityType entityType, Long entityId) {
        CustomUser user = userRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> {
                    logger.error("User not found when trying to unfollow entity",
                            keyValue("action", "unfollow"),
                            keyValue("auth0Id", auth0Id),
                            keyValue("entityType", entityType),
                            keyValue("entityId", entityId));
                    return new IllegalArgumentException(
                            "Utilisateur inexistant (id=" + auth0Id + ")");
                });

        Long userId = user.getId();

        Optional<UserFavorite> favoriteOpt = userFavoriteRepository
                .findByUserAndEntityTypeAndEntityId(user, entityType, entityId);

        if (favoriteOpt.isPresent()) {
            userFavoriteRepository.delete(favoriteOpt.get());

            logger.info("Follow deleted successfully",
                    keyValue("action", "unfollow"),
                    keyValue("userId", userId),
                    keyValue("entityType", entityType),
                    keyValue("entityId", entityId));

            eventPublisher.publishFollowEvent(userId, entityType, entityId, EventType.DELETED);
        }
    }

    public List<UserFavorite> getUserFavorites(Long userId) {
        CustomUser user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.error("User not found when fetching favorites",
                            keyValue("action", "get_user_favorites"),
                            keyValue("userId", userId));
                    return new IllegalArgumentException(
                            "Utilisateur inexistant (id=" + userId + ")");
                });

        List<UserFavorite> favorites = userFavoriteRepository.findByUser(user);

        logger.info("User favorites fetched",
                keyValue("action", "get_user_favorites"),
                keyValue("userId", userId),
                keyValue("favoritesCount", favorites.size()));

        return favorites;
    }

    public List<UserFavorite> getUserFavoritesByType(Long userId, EntityType entityType) {
        CustomUser user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.error("User not found when fetching favorites by type",
                            keyValue("action", "get_user_favorites_by_type"),
                            keyValue("userId", userId),
                            keyValue("entityType", entityType));
                    return new IllegalArgumentException(
                            "Utilisateur inexistant (id=" + userId + ")");
                });

        List<UserFavorite> favorites = userFavoriteRepository.findByUserAndEntityType(user, entityType);

        logger.info("User favorites by type fetched",
                keyValue("action", "get_user_favorites_by_type"),
                keyValue("userId", userId),
                keyValue("entityType", entityType),
                keyValue("favoritesCount", favorites.size()));

        return favorites;
    }
}