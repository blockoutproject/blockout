package com.blockout.notifications.notification.infrastructure.persistence.repositories;

import com.blockout.notifications.notification.infrastructure.persistence.entities.UserNotificationEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface UserNotificationRepository extends JpaRepository<UserNotificationEntity, Long> {

    Slice<UserNotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndIsReadFalse(Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE UserNotificationEntity n
        SET n.isRead = TRUE, n.readAt = :now
        WHERE n.id = :id AND n.userId = :userId AND n.isRead = FALSE
        """)
    int markRead(@Param("userId") Long userId, @Param("id") Long id, @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE UserNotificationEntity n
        SET n.isOpened = TRUE, n.openedAt = :now
        WHERE n.id = :id AND n.userId = :userId AND n.isOpened = FALSE
        """)
    int markOpened(@Param("userId") Long userId, @Param("id") Long id, @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        DELETE FROM UserNotificationEntity n
        WHERE n.id = :id AND n.userId = :userId
        """)
    int deleteForUser(@Param("userId") Long userId, @Param("id") Long id);
}
