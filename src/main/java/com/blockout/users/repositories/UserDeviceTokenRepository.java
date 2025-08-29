package com.blockout.users.repositories;

import com.blockout.users.models.UserDeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserDeviceTokenRepository extends JpaRepository<UserDeviceToken, Long> {

    Optional<UserDeviceToken> findByExpoPushToken(String expoPushToken);

    List<UserDeviceToken> findAllByUser_IdInAndActiveTrue(Collection<Long> userIds);

    Optional<UserDeviceToken> findByUser_IdAndDeviceId(Long userId, String deviceId);

    List<UserDeviceToken> findAllByUser_IdAndDeviceId(Long userId, String deviceId);

    List<UserDeviceToken> findAllByUser_Id(Long userId);

    void deleteByExpoPushToken(String expoPushToken);
}