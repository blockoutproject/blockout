package com.blockout.users.favorite.application;

import com.blockout.users.models.enums.EntityType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Projects effective canonical transitions to retained team, pool, and notification adapters. */
@Component
@RequiredArgsConstructor
public class FavoriteProjectionCoordinator {

    private final TeamFollowerProjection teamFollowers;
    private final PoolFollowerProjection poolFollowers;
    private final FavoriteEventPublisher notificationFollowers;

    public void project(FavoriteChange change) {
        switch (change.target().entityType()) {
            case TEAM -> projectTeam(change);
            case POOL -> projectPool(change);
        }
        projectNotification(change);
    }

    private void projectTeam(FavoriteChange change) {
        if (change.action() == FavoriteEventAction.FOLLOWED) {
            teamFollowers.increment(change.target().entityId(), change.userId());
        } else {
            teamFollowers.decrement(change.target().entityId(), change.userId());
        }
    }

    private void projectPool(FavoriteChange change) {
        if (change.action() == FavoriteEventAction.FOLLOWED) {
            poolFollowers.increment(change.target().entityId(), change.userId());
        } else {
            poolFollowers.decrement(change.target().entityId(), change.userId());
        }
    }

    private void projectNotification(FavoriteChange change) {
        if (change.action() == FavoriteEventAction.FOLLOWED) {
            notificationFollowers.publishCreated(
                    change.userId(), change.target().entityType(), change.target().entityId());
        } else {
            notificationFollowers.publishDeleted(
                    change.userId(), change.target().entityType(), change.target().entityId());
        }
    }
}
