package com.blockout.mobilegateway.notification.application;

import com.blockout.shared.model.DevicePlatformEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MobileNotificationWorkflow {

    private final MobileNotificationGateway notifications;
    private final DivisionLogoGateway divisionLogos;
    private final ConcurrentMap<Long, Optional<String>> divisionLogoCache = new ConcurrentHashMap<>();

    public PageView list(int page, int pageSize) {
        PageView base = notifications.list(page, pageSize);
        List<ItemView> enriched = base.items().stream().map(item -> item.withDivisionLogo(
                item.divisionId() == null
                        ? null
                        : divisionLogoCache.computeIfAbsent(item.divisionId(), divisionLogos::findLogo).orElse(null)))
                .toList();
        return new PageView(enriched, base.page(), base.pageSize(), base.totalItems(), base.hasNext());
    }

    public long unreadCount() {
        return notifications.unreadCount();
    }

    public void markRead(Long id) {
        notifications.markRead(id);
    }

    public void markOpened(Long id) {
        notifications.markOpened(id);
    }

    public void delete(Long id) {
        notifications.delete(id);
    }

    public void register(Long userId, PushTokenCommand command) {
        notifications.register(userId, command);
    }

    public record PushTokenCommand(String expoPushToken, DevicePlatformEnum platform, String deviceId) {
    }

    public record ItemView(
            Long id,
            NotificationTypeEnum type,
            String title,
            String body,
            String deepLink,
            Long divisionId,
            boolean read,
            boolean opened,
            Instant createdAt,
            String divisionLogoUrl) {

        ItemView withDivisionLogo(String logoUrl) {
            return new ItemView(id, type, title, body, deepLink, divisionId, read, opened, createdAt, logoUrl);
        }
    }

    public record PageView(List<ItemView> items, int page, int pageSize, Long totalItems, boolean hasNext) {

        public PageView {
            items = items == null ? List.of() : List.copyOf(items);
        }
    }
}
