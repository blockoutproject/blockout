package com.blockout.users.user.application;

import com.blockout.users.user.application.exceptions.UserNotFoundException;
import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.application.models.FollowEventType;
import com.blockout.users.user.application.ports.FollowerCounter;
import com.blockout.users.user.application.ports.UserFollowPublisher;
import com.blockout.users.user.application.views.UserFavoriteView;
import com.blockout.users.user.infrastructure.persistence.entities.UserEntity;
import com.blockout.users.user.infrastructure.persistence.entities.UserFavoriteEntity;
import com.blockout.users.user.infrastructure.persistence.repositories.UserFavoriteRepository;
import com.blockout.users.user.infrastructure.persistence.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UserFavoriteApplicationService implements UserFavoriteService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserFavoriteApplicationService.class);

    private final UserFavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final UserFollowPublisher followPublisher;
    private final FollowerCounter followerCounter;

    @Override
    @Transactional
    public void follow(String auth0Id, EntityType entityType, Long entityId) {
        UserEntity user = loadUser(auth0Id);
        if (favoriteRepository.existsByUserAndEntityTypeAndEntityId(user, entityType, entityId)) return;

        UserFavoriteEntity favorite = favoriteRepository.save(UserFavoriteEntity.builder()
            .user(user)
            .entityType(entityType)
            .entityId(entityId)
            .build());
        followerCounter.increment(entityType, entityId, user.getId());
        followPublisher.publish(user.getId(), entityType, entityId, FollowEventType.CREATED);
        LOGGER.info("Created user favorite",
            keyValue("action", "follow_entity"),
            keyValue("favoriteId", favorite.getId()),
            keyValue("userId", user.getId()),
            keyValue("entityType", entityType),
            keyValue("entityId", entityId));
    }

    @Override
    @Transactional
    public void unfollow(String auth0Id, EntityType entityType, Long entityId) {
        UserEntity user = loadUser(auth0Id);
        if (favoriteRepository.deleteByUserAndEntityTypeAndEntityId(user, entityType, entityId) == 0) return;

        followerCounter.decrement(entityType, entityId, user.getId());
        followPublisher.publish(user.getId(), entityType, entityId, FollowEventType.DELETED);
        LOGGER.info("Deleted user favorite",
            keyValue("action", "unfollow_entity"),
            keyValue("userId", user.getId()),
            keyValue("entityType", entityType),
            keyValue("entityId", entityId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserFavoriteView> getUserFavorites(Long userId) {
        requireUser(userId);
        return favoriteRepository.findByUserId(userId).stream().map(this::toView).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserFavoriteView> getUserFavoritesByType(Long userId, EntityType entityType) {
        requireUser(userId);
        return favoriteRepository.findByUserIdAndEntityType(userId, entityType).stream().map(this::toView).toList();
    }

    private UserEntity loadUser(String auth0Id) {
        return userRepository.findByAuth0Id(auth0Id).orElseThrow(() -> new UserNotFoundException(auth0Id));
    }

    private void requireUser(Long userId) {
        if (!userRepository.existsById(userId)) throw new UserNotFoundException(userId.toString());
    }

    private UserFavoriteView toView(UserFavoriteEntity favorite) {
        return new UserFavoriteView(
            favorite.getId(), favorite.getEntityType(), favorite.getEntityId(), favorite.getCreatedAt());
    }
}
