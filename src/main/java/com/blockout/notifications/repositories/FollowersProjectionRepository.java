package com.blockout.notifications.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.blockout.notifications.models.FollowersProjection;
import com.blockout.notifications.models.enums.EntityType;

@Repository
public interface FollowersProjectionRepository extends JpaRepository<FollowersProjection, Long> {

    boolean existsByEntityTypeAndEntityIdAndUserId(EntityType entityType, Long entityId, Long userId);

    int deleteByEntityTypeAndEntityIdAndUserId(EntityType entityType, Long entityId, Long userId);
}