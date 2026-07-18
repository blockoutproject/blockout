package com.blockout.notifications.push.persistence;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Owns all Spring Data access to push_tokens for registration and delivery adapters. */
public interface PushTokenRepository extends JpaRepository<PushTokenEntity, Long> {

    Optional<PushTokenEntity> findByExpoPushToken(String expoPushToken);

    Optional<PushTokenEntity> findByUserIdAndDeviceId(Long userId, String deviceId);

    List<PushTokenEntity> findAllByUserIdInAndActiveTrue(List<Long> userIds);

    @Modifying
    @Query("""
            UPDATE PushToken p SET p.active = false
            WHERE p.expoPushToken IN :tokens AND p.active = true
            """)
    int deactivateByTokens(@Param("tokens") Collection<String> tokens);

    @Modifying
    @Query("""
            DELETE FROM PushToken p
            WHERE p.userId = :userId AND p.deviceId = :deviceId AND p.id <> :keepId
            """)
    int deleteOthersByUserAndDevice(
            @Param("userId") Long userId,
            @Param("deviceId") String deviceId,
            @Param("keepId") Long keepId);
}
