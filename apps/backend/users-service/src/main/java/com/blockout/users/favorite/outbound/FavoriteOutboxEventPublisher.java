package com.blockout.users.favorite.outbound;

import com.blockout.outbox.OutboxEvent;
import com.blockout.outbox.OutboxMetadata;
import com.blockout.outbox.OutboxRecorder;
import com.blockout.users.account.application.AccountDeletionEventPublisher;
import com.blockout.users.config.RabbitMQConfig;
import com.blockout.users.favorite.application.FavoriteEventAction;
import com.blockout.users.favorite.application.FavoriteEventFact;
import com.blockout.users.favorite.application.FavoriteEventMetadata;
import com.blockout.users.favorite.application.FavoriteEventPublisher;
import com.blockout.users.models.enums.EntityType;
import com.blockout.users.models.enums.EventType;
import com.blockout.users.models.events.UserFollowEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Adapts favorite and account-deletion facts to the retained transactional outbox contracts. */
@Service
@RequiredArgsConstructor
public class FavoriteOutboxEventPublisher implements FavoriteEventPublisher, AccountDeletionEventPublisher {

    private static final String PRODUCER = "users-service";
    private static final String VERSION = "2.0.0";

    private final OutboxRecorder outbox;
    private final FavoriteEventContractMapper contractMapper;

    @Override
    public void publishCreated(Long userId, EntityType entityType, Long entityId) {
        record(userId, entityType, entityId, EventType.CREATED, FavoriteEventAction.FOLLOWED);
    }

    @Override
    public void publishDeleted(Long userId, EntityType entityType, Long entityId) {
        record(userId, entityType, entityId, EventType.DELETED, FavoriteEventAction.UNFOLLOWED);
    }

    @Override
    public void publishFavoriteDeleted(Long userId, EntityType entityType, Long entityId) {
        publishDeleted(userId, entityType, entityId);
    }

    private void record(
            Long userId,
            EntityType entityType,
            Long entityId,
            EventType legacyType,
            FavoriteEventAction action) {
        OutboxMetadata metadata = outbox.newMetadata();
        FavoriteEventFact fact = new FavoriteEventFact(userId, entityType, entityId, action);
        FavoriteEventMetadata contractMetadata = new FavoriteEventMetadata(
                metadata.eventId(), metadata.occurredAt(), metadata.correlationId());
        Object canonical = canonical(fact, contractMetadata);
        String route = entityType.name().toLowerCase() + ".follow";
        String eventType = canonicalEventType(entityType, action).getValue();
        String orderingKey = "user:%d:%s:%d".formatted(userId, entityType.name().toLowerCase(), entityId);
        var legacy = UserFollowEvent.builder()
                .userId(userId).entityType(entityType).entityId(entityId).eventType(legacyType).build();
        outbox.record(new OutboxEvent(
                metadata, eventType, VERSION, PRODUCER, orderingKey, null,
                RabbitMQConfig.USER_FOLLOW_EXCHANGE, route, legacy, route + ".v2", canonical));
    }

    private Object canonical(FavoriteEventFact fact, FavoriteEventMetadata metadata) {
        return switch (fact.entityType()) {
            case TEAM -> fact.action() == FavoriteEventAction.FOLLOWED
                    ? contractMapper.toTeamFollowed(fact, metadata)
                    : contractMapper.toTeamUnfollowed(fact, metadata);
            case POOL -> fact.action() == FavoriteEventAction.FOLLOWED
                    ? contractMapper.toPoolFollowed(fact, metadata)
                    : contractMapper.toPoolUnfollowed(fact, metadata);
        };
    }

    private com.blockout.events.v2.model.EventType canonicalEventType(
            EntityType entityType, FavoriteEventAction action) {
        return switch (entityType) {
            case TEAM -> action == FavoriteEventAction.FOLLOWED
                    ? com.blockout.events.v2.model.EventType.TEAM_FOLLOWED
                    : com.blockout.events.v2.model.EventType.TEAM_UNFOLLOWED;
            case POOL -> action == FavoriteEventAction.FOLLOWED
                    ? com.blockout.events.v2.model.EventType.POOL_FOLLOWED
                    : com.blockout.events.v2.model.EventType.POOL_UNFOLLOWED;
        };
    }
}
