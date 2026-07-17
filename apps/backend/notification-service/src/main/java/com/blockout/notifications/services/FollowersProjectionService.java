package com.blockout.notifications.services;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockout.notifications.models.entity.FollowersProjection;
import com.blockout.notifications.models.enums.EntityType;
import com.blockout.notifications.followers.application.FollowerProjectionAction;
import com.blockout.notifications.followers.application.FollowerProjectionCommand;
import com.blockout.notifications.followers.application.FollowerProjectionTarget;
import com.blockout.notifications.repositories.FollowersProjectionRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class FollowersProjectionService {

    private static final Logger logger = LoggerFactory.getLogger(FollowersProjectionService.class);
    private final FollowersProjectionRepository followersProjectionRepository;

    @Transactional
    public void followTeam(Long userId, Long teamId) {
        follow(userId, EntityType.TEAM, teamId);
    }

    @Transactional
    public void unfollowTeam(Long userId, Long teamId) {
        unfollow(userId, EntityType.TEAM, teamId);
    }

    @Transactional
    public void followPool(Long userId, Long poolId) {
        follow(userId, EntityType.POOL, poolId);
    }

    @Transactional
    public void unfollowPool(Long userId, Long poolId) {
        unfollow(userId, EntityType.POOL, poolId);
    }

    /** Applies either wire version through the same idempotent projection behavior. */
    @Transactional
    public void apply(FollowerProjectionCommand command) {
        if (command.action() == FollowerProjectionAction.FOLLOW) {
            follow(command.userId(), command.entityType(), command.entityId());
        } else {
            unfollow(command.userId(), command.entityType(), command.entityId());
        }
    }

    /** Reconciles one user's derived rows against the canonical users-service favorite snapshot. */
    @Transactional
    public void rebuildUser(Long userId, Collection<FollowerProjectionTarget> canonicalFavorites) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId must be a positive numeric ID");
        }
        Set<FollowerProjectionTarget> desired = Set.copyOf(canonicalFavorites);
        Set<FollowerProjectionTarget> current = new HashSet<>();
        for (FollowersProjection row : followersProjectionRepository.findByUserId(userId)) {
            current.add(new FollowerProjectionTarget(row.getEntityType(), row.getEntityId()));
        }
        for (FollowerProjectionTarget stale : current) {
            if (!desired.contains(stale)) {
                unfollow(userId, stale.entityType(), stale.entityId());
            }
        }
        for (FollowerProjectionTarget missing : desired) {
            if (!current.contains(missing)) {
                follow(userId, missing.entityType(), missing.entityId());
            }
        }
        logger.info("Follower projection reconciled from canonical favorites",
                keyValue("action", "followers_projection_rebuild_user"),
                keyValue("userId", userId),
                keyValue("beforeCount", current.size()),
                keyValue("afterCount", desired.size()));
    }

    private void follow(Long userId, EntityType entityType, Long entityId) {
        boolean already = followersProjectionRepository
                .existsByEntityTypeAndEntityIdAndUserId(entityType, entityId, userId);

        if (already) {
            logger.info("Follow already present (noop)",
                    keyValue("action", "followers_projection_follow_noop"),
                    keyValue("entityType", entityType),
                    keyValue("entityId", entityId),
                    keyValue("userId", userId));
            return;
        }

        FollowersProjection row = FollowersProjection.builder()
                .entityType(entityType)
                .entityId(entityId)
                .userId(userId)
                .createdAt(LocalDateTime.now())
                .lastUpdate(LocalDateTime.now())
                .build();

        try {
            followersProjectionRepository.save(row);
            logger.info("Follow added to projection",
                    keyValue("action", "followers_projection_follow"),
                    keyValue("entityType", entityType),
                    keyValue("entityId", entityId),
                    keyValue("userId", userId));
        } catch (DataIntegrityViolationException dup) {
            logger.info("Follow deduplicated by DB unique constraint",
                    keyValue("action", "followers_projection_follow_dedup"),
                    keyValue("entityType", entityType),
                    keyValue("entityId", entityId),
                    keyValue("userId", userId));
        }
    }

    private void unfollow(Long userId, EntityType entityType, Long entityId) {
        int deleted = followersProjectionRepository
                .deleteByEntityTypeAndEntityIdAndUserId(entityType, entityId, userId);

        if (deleted > 0) {
            logger.info("Follow removed from projection",
                    keyValue("action", "followers_projection_unfollow"),
                    keyValue("entityType", entityType),
                    keyValue("entityId", entityId),
                    keyValue("userId", userId));
        } else {
            logger.info("Unfollow noop (not found)",
                    keyValue("action", "followers_projection_unfollow_noop"),
                    keyValue("entityType", entityType),
                    keyValue("entityId", entityId),
                    keyValue("userId", userId));
        }
    }
}
