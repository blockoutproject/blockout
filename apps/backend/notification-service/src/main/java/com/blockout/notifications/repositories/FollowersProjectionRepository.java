package com.blockout.notifications.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.blockout.notifications.models.entity.FollowersProjection;
import com.blockout.notifications.models.enums.EntityType;
import java.util.List;

@Repository
public interface FollowersProjectionRepository extends JpaRepository<FollowersProjection, Long> {

    boolean existsByEntityTypeAndEntityIdAndUserId(EntityType entityType, Long entityId, Long userId);

    int deleteByEntityTypeAndEntityIdAndUserId(EntityType entityType, Long entityId, Long userId);

    List<FollowersProjection> findByUserId(Long userId);
}
