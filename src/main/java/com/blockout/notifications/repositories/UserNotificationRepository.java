package com.blockout.notifications.repositories;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.blockout.notifications.models.entity.UserNotification;

import java.time.Instant;

@Repository
public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {

    Slice<UserNotification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndIsReadFalse(Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE UserNotification n
            SET n.isRead = TRUE, n.readAt = :now
            WHERE n.id = :id AND n.userId = :userId AND n.isRead = FALSE
            """)
    int markRead(@Param("userId") Long userId, @Param("id") Long id, @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE UserNotification n
            SET n.isOpened = TRUE, n.openedAt = :now
            WHERE n.id = :id AND n.userId = :userId AND n.isOpened = FALSE
            """)
    int markOpened(@Param("userId") Long userId, @Param("id") Long id, @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            DELETE FROM UserNotification n
            WHERE n.id = :id AND n.userId = :userId
            """)
    int deleteForUser(@Param("userId") Long userId, @Param("id") Long id);
}