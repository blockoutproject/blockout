package com.blockout.notifications.followers.persistence;

import com.blockout.shared.model.EntityTypeEnum;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Owns atomic idempotent writes and bounded reads for followers_projection. */
@Repository
public interface FollowerProjectionRepository extends JpaRepository<FollowerProjectionEntity, Long> {

    @Modifying
    @Query(value = """
            INSERT INTO followers_projection (
                entity_type,
                entity_id,
                user_id,
                created_at,
                last_update
            ) VALUES (
                :entityType,
                :entityId,
                :userId,
                :createdAt,
                :lastUpdate
            )
            ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(
            @Param("userId") Long userId,
            @Param("entityType") String entityType,
            @Param("entityId") Long entityId,
            @Param("createdAt") LocalDateTime createdAt,
            @Param("lastUpdate") LocalDateTime lastUpdate);

    int deleteByEntityTypeAndEntityIdAndUserId(EntityTypeEnum entityType, Long entityId, Long userId);

    List<FollowerProjectionEntity> findByUserId(Long userId);
}
