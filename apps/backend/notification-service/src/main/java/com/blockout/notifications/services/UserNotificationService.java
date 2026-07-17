package com.blockout.notifications.services;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.blockout.notifications.models.entity.UserNotification;
import com.blockout.notifications.models.enums.NotificationTargetType;
import com.blockout.notifications.models.enums.NotificationType;
import com.blockout.notifications.repositories.UserNotificationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UserNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(UserNotificationService.class);

    private final UserNotificationRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void createNotificationsBatch(List<UserNotification> items) {
        if (items == null || items.isEmpty())
            return;
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

        JsonNode meta = null;
        try {
            if (metadataJson != null && !metadataJson.isBlank()) {
                meta = objectMapper.readTree(metadataJson);
            }
        } catch (Exception e) {
            logger.warn("Invalid metadata JSON", e);
        }

        UserNotification entity = UserNotification.builder()
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

        UserNotification saved = repository.save(entity);

        logger.info("Notification inbox created",
                keyValue("action", "notification_inbox_create"),
                keyValue("userId", userId),
                keyValue("notificationId", saved.getId()),
                keyValue("type", type));

        return saved;
    }
}
