package com.blockout.users.favorite.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.shared.model.EntityTypeEnum;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns canonical favorite state while retaining current counter and event side effects. */
@Service
@RequiredArgsConstructor
public class UserFavoriteApplicationService implements FavoriteService, FavoriteProjectionSource {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserFavoriteApplicationService.class);

    private final FavoriteStore favorites;
    private final FavoriteProjectionCoordinator projections;

    /** {@inheritDoc} */
    @Override
    public List<FavoriteView> listUnpaged(Long userId, EntityTypeEnum entityType) {
        requireUser(userId, entityType);
        List<FavoriteView> result = favorites.findUnpaged(userId, entityType);
        LOGGER.info("Favoris récupérés", keyValue("userId", userId), keyValue("entityType", entityType),
                keyValue("count", result.size()));
        return result;
    }

    /** {@inheritDoc} */
    @Override
    public FavoritePage listPage(Long userId, EntityTypeEnum entityType, int page, int pageSize) {
        requireUser(userId, entityType);
        return favorites.findPage(userId, entityType, page, pageSize);
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public void follow(FavoriteCommand command) {
        FavoriteOwner owner = requireUser(command);
        FavoriteTarget target = new FavoriteTarget(command.entityType(), command.entityId());
        owner.follow(target).ifPresentOrElse(change -> {
            LOGGER.info("Suivi enregistré", keyValue("userId", change.userId()),
                    keyValue("entityType", target.entityType()), keyValue("entityId", target.entityId()),
                    keyValue("favoriteId", change.favoriteId()));
            projections.project(change);
        }, () -> LOGGER.info("Suivi déjà existant", keyValue("userId", owner.userId()),
                keyValue("entityType", target.entityType()), keyValue("entityId", target.entityId())));
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public void unfollow(FavoriteCommand command) {
        FavoriteOwner owner = requireUser(command);
        FavoriteTarget target = new FavoriteTarget(command.entityType(), command.entityId());
        owner.unfollow(target).ifPresent(change -> {
            LOGGER.info("Suivi supprimé", keyValue("userId", change.userId()),
                    keyValue("entityType", target.entityType()), keyValue("entityId", target.entityId()));
            projections.project(change);
        });
    }

    /** Resolves the compatibility identity before any favorite mutation. */
    private FavoriteOwner requireUser(FavoriteCommand command) {
        return favorites.findOwnerByAuth0Id(command.auth0Id()).orElseThrow(() -> {
            LOGGER.error("Utilisateur introuvable pour mutation de favori", keyValue("auth0Id", command.auth0Id()),
                    keyValue("entityType", command.entityType()), keyValue("entityId", command.entityId()));
            return new CustomUserNotFoundException(command.auth0Id());
        });
    }

    /** Preserves the v1 read's explicit local-user existence check. */
    private void requireUser(Long userId, EntityTypeEnum entityType) {
        if (!favorites.ownerExists(userId)) {
            LOGGER.error("Utilisateur introuvable lors de la récupération des favoris",
                    keyValue("userId", userId), keyValue("entityType", entityType));
            throw new CustomUserNotFoundException(userId.toString());
        }
    }

    @Override
    public FavoriteProjectionSnapshot snapshotForUser(Long userId) {
        requireUser(userId, null);
        return favorites.snapshotForUser(userId);
    }

    @Override
    public FollowerCountSnapshot snapshotForTarget(EntityTypeEnum entityType, Long entityId) {
        return favorites.snapshotForTarget(entityType, entityId);
    }
}
