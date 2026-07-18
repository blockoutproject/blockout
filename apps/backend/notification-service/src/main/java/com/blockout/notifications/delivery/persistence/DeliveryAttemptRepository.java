package com.blockout.notifications.delivery.persistence;

import com.blockout.shared.model.NotificationTypeEnum;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Owns typed reservation and state transitions for notification_send. */
@Repository
public interface DeliveryAttemptRepository extends JpaRepository<DeliveryAttemptEntity, Long> {

    @Modifying
    @Query(value = """
            INSERT INTO notification_send (
                user_id,
                match_id,
                notification_type,
                status,
                created_at,
                last_update
            )
            SELECT DISTINCT
                fp.user_id,
                :matchId,
                :notificationType,
                'PENDING',
                now(),
                now()
            FROM followers_projection fp
            WHERE
                (fp.entity_type = 'TEAM' AND fp.entity_id IN (:teamIdA, :teamIdB))
                OR (fp.entity_type = 'POOL' AND fp.entity_id = :poolId)
            ON CONFLICT (user_id, match_id, notification_type) DO NOTHING
            RETURNING user_id
            """, nativeQuery = true)
    List<Long> insertPendingForMatchAndType(
            @Param("matchId") Long matchId,
            @Param("teamIdA") Long teamIdA,
            @Param("teamIdB") Long teamIdB,
            @Param("poolId") Long poolId,
            @Param("notificationType") String notificationType);

    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE NotificationSend ns
                SET ns.status = 'SENT',
                    ns.sentAt = :sentAt,
                    ns.lastUpdate = :now
            WHERE ns.matchId = :matchId
                AND ns.notificationType = :notificationType
                AND ns.userId IN :userIds
                AND ns.status = 'PENDING'
            """)
    int markSent(
            @Param("matchId") Long matchId,
            @Param("notificationType") NotificationTypeEnum notificationType,
            @Param("userIds") Collection<Long> userIds,
            @Param("sentAt") LocalDateTime sentAt,
            @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE NotificationSend ns
                SET ns.status = 'SENT_NO_TOKEN',
                    ns.lastUpdate = :now
            WHERE ns.matchId = :matchId
                AND ns.notificationType = :notificationType
                AND ns.userId IN :userIds
                AND ns.status = 'PENDING'
            """)
    int markNoToken(
            @Param("matchId") Long matchId,
            @Param("notificationType") NotificationTypeEnum notificationType,
            @Param("userIds") Collection<Long> userIds,
            @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE NotificationSend ns
                SET ns.status = 'FAILED',
                    ns.errorCode = :errorCode,
                    ns.errorDetail = :errorDetail,
                    ns.failedAt = :failedAt,
                    ns.lastUpdate = :now
            WHERE ns.matchId = :matchId
                AND ns.notificationType = :notificationType
                AND ns.userId IN :userIds
                AND ns.status = 'PENDING'
            """)
    int markFailed(
            @Param("matchId") Long matchId,
            @Param("notificationType") NotificationTypeEnum notificationType,
            @Param("userIds") Collection<Long> userIds,
            @Param("errorCode") String errorCode,
            @Param("errorDetail") String errorDetail,
            @Param("failedAt") LocalDateTime failedAt,
            @Param("now") LocalDateTime now);
}
