package com.blockout.workernotifications.services;

import com.blockout.workernotifications.models.UserNotification;
import com.blockout.workernotifications.models.enums.NotificationType;
import com.blockout.workernotifications.models.enums.NotificationTargetType;
import com.blockout.workernotifications.models.dto.users.CustomUserDto;
import com.blockout.workernotifications.repositories.UserNotificationRepository;
import com.blockout.workernotifications.services.clients.UsersClientService;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UserNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(UserNotificationService.class);

    private final UserNotificationRepository repository;
    private final UsersClientService usersClientService;

    private Long resolveUserIdOrThrow(String auth0Id) {
        CustomUserDto user = usersClientService.getUserByAuth0Id(auth0Id);
        if (user == null || user.getId() == null) {
            logger.warn("User not found for auth0Id",
                    keyValue("action", "resolve_user_id_failed"),
                    keyValue("auth0Id", auth0Id));
            throw new IllegalArgumentException("Utilisateur introuvable pour auth0Id=" + auth0Id);
        }
        return user.getId();
    }

    @Transactional
    public void createNotificationsBatch(List<UserNotification> items) {
        if (items == null || items.isEmpty()) return;
        repository.saveAll(items);
        logger.info("Notification inbox batch created",
                keyValue("action", "notification_inbox_create_batch"),
                keyValue("count", items.size()));
    }

    @Transactional
    public UserNotification createNotification(
            Long userId,
            NotificationType type,
            String title,
            String body,
            String deepLink,
            NotificationTargetType targetType,
            Long targetId,
            String metadataJson) {

        UserNotification entity = UserNotification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .body(body)
                .deepLink(deepLink)
                .targetType(targetType)
                .targetId(targetId)
                .metadata(metadataJson)
                .isRead(false)
                .isOpened(false)
                .createdAt(LocalDateTime.now())
                .build();

        UserNotification saved = repository.save(entity);

        logger.info("Notification inbox created",
                keyValue("action", "notification_inbox_create"),
                keyValue("userId", userId),
                keyValue("notificationId", saved.getId()),
                keyValue("type", type));

        return saved;
    }

    public Page<UserNotification> listNotificationsByAuth0Id(String auth0Id, int page, int size) {
        Long userId = resolveUserIdOrThrow(auth0Id);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return repository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public long unreadCountByAuth0Id(String auth0Id) {
        Long userId = resolveUserIdOrThrow(auth0Id);
        return repository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public boolean markReadByAuth0Id(String auth0Id, Long notificationId) {
        Long userId = resolveUserIdOrThrow(auth0Id);
        int n = repository.markRead(userId, notificationId);
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
    public boolean markOpenedByAuth0Id(String auth0Id, Long notificationId) {
        Long userId = resolveUserIdOrThrow(auth0Id);
        int n = repository.markOpened(userId, notificationId);
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
    public boolean deleteByAuth0Id(String auth0Id, Long notificationId) {
        Long userId = resolveUserIdOrThrow(auth0Id);
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