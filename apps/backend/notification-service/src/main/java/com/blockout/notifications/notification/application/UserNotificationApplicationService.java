package com.blockout.notifications.notification.application;

import com.blockout.notifications.notification.application.models.NotificationTargetType;
import com.blockout.notifications.notification.application.models.NotificationType;
import com.blockout.notifications.notification.application.views.NotificationPageView;
import com.blockout.notifications.notification.application.views.NotificationView;
import com.blockout.notifications.notification.infrastructure.http.UserHttpClient;
import com.blockout.notifications.notification.infrastructure.http.models.UserInternalResponse;
import com.blockout.notifications.notification.infrastructure.persistence.entities.UserNotificationEntity;
import com.blockout.notifications.notification.infrastructure.persistence.repositories.UserNotificationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UserNotificationApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(UserNotificationApplicationService.class);

    private final UserNotificationRepository repository;
    private final UserHttpClient usersClientService;
    private final ObjectMapper objectMapper;

    private Long resolveUserIdOrThrow() {
        UserInternalResponse user = usersClientService.getCurrentUser();
        if (user == null || user.getId() == null) {
            logger.warn("User not found for auth0Id",
                keyValue("action", "resolve_user_id_failed"));
            throw new IllegalArgumentException("Utilisateur introuvable");
        }
        return user.getId();
    }

    @Transactional
    public void createNotificationsBatch(List<UserNotificationEntity> items) {
        if (items == null || items.isEmpty())
            return;
        repository.saveAll(items);
        logger.info("Notification inbox batch created",
            keyValue("action", "notification_inbox_create_batch"),
            keyValue("count", items.size()));
    }

    @Transactional
    public UserNotificationEntity createNotification(
        Long userId,
        NotificationType type,
        String title,
        String body,
        String deepLink,
        NotificationTargetType targetType,
        Long targetId,
        String metadataJson) {

        JsonNode meta = null;
        try {
            if (metadataJson != null && !metadataJson.isBlank()) {
                meta = objectMapper.readTree(metadataJson);
            }
        } catch (Exception e) {
            logger.warn("Invalid metadata JSON", e);
        }

        UserNotificationEntity entity = UserNotificationEntity.builder()
            .userId(userId)
            .type(type)
            .title(title)
            .body(body)
            .deepLink(deepLink)
            .targetType(targetType)
            .targetId(targetId)
            .metadata(meta)
            .isRead(false)
            .isOpened(false)
            .createdAt(Instant.now()) // UTC
            .build();

        UserNotificationEntity saved = repository.save(entity);

        logger.info("Notification inbox created",
            keyValue("action", "notification_inbox_create"),
            keyValue("userId", userId),
            keyValue("notificationId", saved.getId()),
            keyValue("type", type));

        return saved;
    }

    public NotificationPageView getNotifications(int page, int size) {
        Long userId = resolveUserIdOrThrow();

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Slice<UserNotificationEntity> slice = repository.findByUserIdOrderByCreatedAtDesc(userId, pageable);

        boolean hasNext = slice.hasNext();
        Integer nextPage = hasNext ? page + 1 : null;

        logger.debug("Returning paginated notifications",
            keyValue("action", "get_notifications"),
            keyValue("userId", userId),
            keyValue("page", page),
            keyValue("size", size),
            keyValue("items", slice.getNumberOfElements()),
            keyValue("hasNext", hasNext),
            keyValue("nextPage", nextPage));

        return new NotificationPageView(slice.getContent().stream().map(this::toView).toList(), hasNext, nextPage);
    }

    private NotificationView toView(UserNotificationEntity notification) {
        return new NotificationView(
            notification.getId(), notification.getUserId(), notification.getType(), notification.getTitle(),
            notification.getBody(), notification.getDeepLink(), notification.getTargetType(),
            notification.getTargetId(), notification.getMetadata(), notification.getIsRead(),
            notification.getIsOpened(), notification.getCreatedAt(), notification.getReadAt(),
            notification.getOpenedAt());
    }

    public long unreadCount() {
        Long userId = resolveUserIdOrThrow();
        return repository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public boolean markRead(Long notificationId) {
        Long userId = resolveUserIdOrThrow();
        int n = repository.markRead(userId, notificationId, Instant.now());
        if (n > 0) {
            logger.info("Notification marked read",
                keyValue("action", "notification_mark_read"),
                keyValue("userId", userId),
                keyValue("notificationId", notificationId));
            return true;
        }
        return false;
    }

    @Transactional
    public boolean markOpened(Long notificationId) {
        Long userId = resolveUserIdOrThrow();
        int n = repository.markOpened(userId, notificationId, Instant.now());
        if (n > 0) {
            logger.info("Notification marked opened",
                keyValue("action", "notification_mark_opened"),
                keyValue("userId", userId),
                keyValue("notificationId", notificationId));
            return true;
        }
        return false;
    }

    @Transactional
    public boolean delete(Long notificationId) {
        Long userId = resolveUserIdOrThrow();
        int n = repository.deleteForUser(userId, notificationId);
        if (n > 0) {
            logger.info("Notification deleted",
                keyValue("action", "notification_delete"),
                keyValue("userId", userId),
                keyValue("notificationId", notificationId));
            return true;
        }
        return false;
    }
}
