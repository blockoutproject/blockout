package com.blockout.users.favorite.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.models.entities.UserFavorite;
import com.blockout.users.models.enums.EntityType;
import com.blockout.users.repositories.UserFavoriteRepository;
import com.blockout.users.repositories.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns canonical favorite state while retaining current counter and event side effects. */
@Service
@RequiredArgsConstructor
public class UserFavoriteApplicationService implements FavoriteService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserFavoriteApplicationService.class);
    private static final Sort CANONICAL_ORDER = Sort.by("createdAt").ascending().and(Sort.by("id").ascending());

    private final UserFavoriteRepository favorites;
    private final UserRepository users;
    private final FavoritePersistenceMapper mapper;
    private final TeamFollowerProjection teamFollowers;
    private final PoolFollowerProjection poolFollowers;
    private final FavoriteEventPublisher events;

    /** {@inheritDoc} */
    @Override
    public List<FavoriteView> listUnpaged(Long userId, EntityType entityType) {
        requireUser(userId, entityType);
        List<UserFavorite> result = entityType == null
                ? favorites.findByUserId(userId)
                : favorites.findByUserIdAndEntityType(userId, entityType);
        LOGGER.info("Favoris récupérés", keyValue("userId", userId), keyValue("entityType", entityType),
                keyValue("count", result.size()));
        return result.stream().map(mapper::toView).toList();
    }

    /** {@inheritDoc} */
    @Override
    public FavoritePage listPage(Long userId, EntityType entityType, int page, int pageSize) {
        requireUser(userId, entityType);
        PageRequest request = PageRequest.of(page, pageSize, CANONICAL_ORDER);
        Page<UserFavorite> result = entityType == null
                ? favorites.findByUserId(userId, request)
                : favorites.findByUserIdAndEntityType(userId, entityType, request);
        return new FavoritePage(
                result.getContent().stream().map(mapper::toView).toList(),
                page,
                pageSize,
                result.getTotalElements(),
                result.hasNext());
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public void follow(FavoriteCommand command) {
        CustomUser user = requireUser(command);
        if (favorites.existsByUserAndEntityTypeAndEntityId(user, command.entityType(), command.entityId())) {
            LOGGER.info("Suivi déjà existant", keyValue("userId", user.getId()),
                    keyValue("entityType", command.entityType()), keyValue("entityId", command.entityId()));
            return;
        }

        UserFavorite saved = favorites.save(UserFavorite.builder()
                .user(user)
                .entityType(command.entityType())
                .entityId(command.entityId())
                .build());
        LOGGER.info("Suivi enregistré", keyValue("userId", user.getId()),
                keyValue("entityType", command.entityType()), keyValue("entityId", command.entityId()),
                keyValue("favoriteId", saved.getId()));

        incrementProjection(command, user.getId());
        events.publishCreated(user.getId(), command.entityType(), command.entityId());
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public void unfollow(FavoriteCommand command) {
        CustomUser user = requireUser(command);
        int deleted = favorites.deleteByUserAndEntityTypeAndEntityId(
                user, command.entityType(), command.entityId());
        if (deleted == 0) {
            return;
        }

        LOGGER.info("Suivi supprimé", keyValue("userId", user.getId()),
                keyValue("entityType", command.entityType()), keyValue("entityId", command.entityId()));
        decrementProjection(command, user.getId());
        events.publishDeleted(user.getId(), command.entityType(), command.entityId());
    }

    /** Resolves the compatibility identity before any favorite mutation. */
    private CustomUser requireUser(FavoriteCommand command) {
        return users.findByAuth0Id(command.auth0Id()).orElseThrow(() -> {
            LOGGER.error("Utilisateur introuvable pour mutation de favori", keyValue("auth0Id", command.auth0Id()),
                    keyValue("entityType", command.entityType()), keyValue("entityId", command.entityId()));
            return new CustomUserNotFoundException(command.auth0Id());
        });
    }

    /** Preserves the v1 read's explicit local-user existence check. */
    private void requireUser(Long userId, EntityType entityType) {
        if (!users.existsById(userId)) {
            LOGGER.error("Utilisateur introuvable lors de la récupération des favoris",
                    keyValue("userId", userId), keyValue("entityType", entityType));
            throw new CustomUserNotFoundException(userId.toString());
        }
    }

    /** Preserves the deployed type-specific synchronous counter ordering. */
    private void incrementProjection(FavoriteCommand command, Long userId) {
        if (command.entityType() == EntityType.TEAM) {
            teamFollowers.increment(command.entityId(), userId);
        }
        if (command.entityType() == EntityType.POOL) {
            poolFollowers.increment(command.entityId(), userId);
        }
    }

    /** Preserves the deployed type-specific synchronous counter ordering. */
    private void decrementProjection(FavoriteCommand command, Long userId) {
        if (command.entityType() == EntityType.TEAM) {
            teamFollowers.decrement(command.entityId(), userId);
        }
        if (command.entityType() == EntityType.POOL) {
            poolFollowers.decrement(command.entityId(), userId);
        }
    }
}
