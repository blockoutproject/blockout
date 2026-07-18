package com.blockout.notifications.followers.persistence;

import com.blockout.notifications.followers.application.FollowerProjectionStore;
import com.blockout.notifications.followers.application.FollowerProjectionTarget;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Maps application targets to atomic projection persistence operations. */
@Component
@RequiredArgsConstructor
public class JpaFollowerProjectionStore implements FollowerProjectionStore {

    private final FollowerProjectionRepository repository;

    @Override
    public boolean add(Long userId, FollowerProjectionTarget target) {
        LocalDateTime now = LocalDateTime.now();
        return repository.insertIfAbsent(
                userId, target.entityType().name(), target.entityId(), now, now) == 1;
    }

    @Override
    public boolean remove(Long userId, FollowerProjectionTarget target) {
        return repository.deleteByEntityTypeAndEntityIdAndUserId(
                target.entityType(), target.entityId(), userId) == 1;
    }

    @Override
    public Set<FollowerProjectionTarget> findByUserId(Long userId) {
        return repository.findByUserId(userId).stream()
                .map(row -> new FollowerProjectionTarget(row.getEntityType(), row.getEntityId()))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
