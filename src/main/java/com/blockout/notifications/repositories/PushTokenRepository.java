package com.blockout.notifications.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.blockout.notifications.models.entity.PushToken;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PushTokenRepository extends JpaRepository<PushToken, Long> {

    Optional<PushToken> findByExpoPushToken(String expoPushToken);

    Optional<PushToken> findByUserIdAndDeviceId(Long userId, String deviceId);

    List<PushToken> findAllByUserIdAndDeviceId(Long userId, String deviceId);

    List<PushToken> findAllByUserIdInAndActiveTrue(List<Long> userIds);

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
    int deleteOthersByUserAndDevice(@Param("userId") Long userId, @Param("deviceId") String deviceId,
            @Param("keepId") Long keepId);
}