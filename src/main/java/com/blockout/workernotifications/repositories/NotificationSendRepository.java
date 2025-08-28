package com.blockout.workernotifications.repositories;

import com.blockout.workernotifications.models.NotificationSend;
import com.blockout.workernotifications.models.enums.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface NotificationSendRepository extends JpaRepository<NotificationSend, Long> {

    boolean existsByUserIdAndMatchId(Long userId, Long matchId);

    /**
     * Réservation atomique & idempotente :
     * - sélectionne tous les followers des entités liées au match,
     * - insère en PENDING avec (user_id, match_id) unique,
     * - renvoie la liste des user_id réellement insérés (dédup en base).
     *
     * Requiert PostgreSQL (ON CONFLICT ... DO NOTHING RETURNING).
     */
    @Modifying
    @Query(value = """
            INSERT INTO notification_send (user_id, match_id, status, created_at, last_update)
            SELECT DISTINCT fp.user_id, :matchId, 'PENDING', now(), now()
            FROM followers_projection fp
            WHERE (fp.entity_type = 'TEAM' AND (cardinality(:teamIds) = 0 OR fp.entity_id = ANY(:teamIds)))
                OR (fp.entity_type = 'POOL' AND (cardinality(:poolIds) = 0 OR fp.entity_id = ANY(:poolIds)))
            ON CONFLICT (user_id, match_id) DO NOTHING
            RETURNING user_id
            """, nativeQuery = true)
    List<Long> insertPendingForMatch(@Param("matchId") Long matchId,
            @Param("teamIds") Long[] teamIds,
            @Param("poolIds") Long[] poolIds);

    /**
     * Marque SENT pour un match et une liste d'utilisateurs (seulement si encore
     * PENDING).
     */
    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE NotificationSend ns
                SET ns.status = :status,
                    ns.sentAt = :sentAt,
                    ns.lastUpdate = :now
            WHERE ns.matchId = :matchId
                AND ns.userId IN :userIds
                AND ns.status = 'PENDING'
            """)
    int markSent(@Param("matchId") Long matchId,
            @Param("userIds") Collection<Long> userIds,
            @Param("status") NotificationStatus status,
            @Param("sentAt") LocalDateTime sentAt,
            @Param("now") LocalDateTime now);

    /**
     * Marque SENT_NO_TOKEN pour les lignes encore PENDING.
     */
    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE NotificationSend ns
                SET ns.status = 'SENT_NO_TOKEN',
                    ns.lastUpdate = :now
            WHERE ns.matchId = :matchId
                AND ns.userId IN :userIds
                AND ns.status = 'PENDING'
            """)
    int markNoToken(@Param("matchId") Long matchId,
            @Param("userIds") Collection<Long> userIds,
            @Param("now") LocalDateTime now);

    /**
     * Marque FAILED (peu importe l'état précédent — utile pour erreurs Expo
     * immédiates).
     */
    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE NotificationSend ns
                SET ns.status = 'FAILED',
                    ns.errorCode = :errorCode,
                    ns.errorDetail = :errorDetail,
                    ns.failedAt = :failedAt,
                    ns.lastUpdate = :now
            WHERE ns.matchId = :matchId
                AND ns.userId IN :userIds
            """)
    int markFailed(@Param("matchId") Long matchId,
            @Param("userIds") Collection<Long> userIds,
            @Param("errorCode") String errorCode,
            @Param("errorDetail") String errorDetail,
            @Param("failedAt") LocalDateTime failedAt,
            @Param("now") LocalDateTime now);

    /**
     * Marque DELIVERED (quand tu traiteras les receipts Expo).
     */
    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE NotificationSend ns
                SET ns.status = 'DELIVERED',
                    ns.deliveredAt = :deliveredAt,
                    ns.lastUpdate = :now
            WHERE ns.matchId = :matchId 
                AND ns.userId IN :userIds
            """)
    int markDelivered(@Param("matchId") Long matchId,
            @Param("userIds") Collection<Long> userIds,
            @Param("deliveredAt") LocalDateTime deliveredAt,
            @Param("now") LocalDateTime now);
}