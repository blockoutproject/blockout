package com.blockout.notifications.inbox.persistence;

import com.blockout.notifications.inbox.application.NotificationInboxPage;
import com.blockout.notifications.inbox.application.NotificationInboxStore;
import com.blockout.notifications.models.entity.UserNotification;
import com.blockout.notifications.repositories.UserNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

/** Adapts Spring Data inbox slices to application-owned pages. */
@Component
@RequiredArgsConstructor
public class JpaNotificationInboxStore implements NotificationInboxStore {

    private final UserNotificationRepository repository;
    private final NotificationInboxPersistenceMapper mapper;

    /** {@inheritDoc} */
    @Override
    public NotificationInboxPage findStable(Long userId, int page, int pageSize) {
        Slice<UserNotification> result = repository.findByUserIdOrderByCreatedAtDescIdDesc(
                userId, PageRequest.of(page, pageSize));
        return toPage(result, page, pageSize);
    }

    /** {@inheritDoc} */
    @Override
    public NotificationInboxPage findLegacy(Long userId, int page, int pageSize) {
        Slice<UserNotification> result = repository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(page, pageSize, Sort.by(Sort.Direction.DESC, "createdAt")));
        return toPage(result, page, pageSize);
    }

    /** Maps one Spring Data slice without exposing it beyond the adapter. */
    private NotificationInboxPage toPage(Slice<UserNotification> result, int page, int pageSize) {
        return new NotificationInboxPage(
                result.getContent().stream().map(mapper::toSnapshot).toList(),
                page,
                pageSize,
                result.hasNext());
    }
}
