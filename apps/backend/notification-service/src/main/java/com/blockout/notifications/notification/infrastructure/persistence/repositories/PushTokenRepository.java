package com.blockout.notifications.notification.infrastructure.persistence.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.blockout.notifications.notification.infrastructure.persistence.entities.PushTokenEntity;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PushTokenRepository extends JpaRepository<PushTokenEntity, Long> {

    Optional<PushTokenEntity> findByExpoPushToken(String expoPushToken);

    Optional<PushTokenEntity> findByUserIdAndDeviceId(Long userId, String deviceId);

    List<PushTokenEntity> findAllByUserIdAndDeviceId(Long userId, String deviceId);

    List<PushTokenEntity> findAllByUserIdInAndActiveTrue(List<Long> userIds);

    @Modifying
    @Query("""
            UPDATE PushTokenEntity p SET p.active = false
            WHERE p.expoPushToken IN :tokens AND p.active = true
            """)
    int deactivateByTokens(@Param("tokens") Collection<String> tokens);

    @Modifying
    @Query("""
            DELETE FROM PushTokenEntity p
            WHERE p.userId = :userId AND p.deviceId = :deviceId AND p.id <> :keepId
            """)
    int deleteOthersByUserAndDevice(@Param("userId") Long userId, @Param("deviceId") String deviceId,
            @Param("keepId") Long keepId);
}
