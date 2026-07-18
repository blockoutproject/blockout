package com.blockout.workersearch.listeners.team;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.events.LifecycleEventDeduplicator;
import com.blockout.workersearch.events.LifecycleV2MessageDecoder;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.services.index.TeamIndexService;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class TeamUpsertListener {

    private static final Logger logger = LoggerFactory.getLogger(TeamUpsertListener.class);

    private final TeamIndexService teamIndexService;
    private final LifecycleV2MessageDecoder decoder;
    private final LifecycleEventDeduplicator deduplicator;

    @RabbitListener(queues = RabbitMQConfig.TEAM_UPSERT_QUEUE_SEARCH, containerFactory = "rabbitBatchFactory",
            autoStartup = "${blockout.events.consumers.lifecycle-v1-enabled:true}")
    public void onUpsertBatch(List<Message<TeamUpsertEvent>> messages, Channel channel) throws IOException {
        Long lastTag = (Long) messages.get(messages.size() - 1).getHeaders().get(AmqpHeaders.DELIVERY_TAG);
        List<Claimed<TeamUpsertEvent>> claimed = claimLegacy(messages);

        logger.info("Received batch of TeamUpsertEvent",
                keyValue("action", "receive_team_batch"),
                keyValue("count", claimed.size()));

        try {
            if (!claimed.isEmpty()) {
                teamIndexService.upsertBatch(claimed.stream().map(Claimed::event).toList());
            }
            claimed.forEach(item -> deduplicator.complete(item.eventId(), "TEAM_UPSERT", "v1"));
            channel.basicAck(lastTag, true);

            logger.info("Successfully processed and acknowledged team batch",
                    keyValue("action", "team_index_batch_upsert"),
                    keyValue("count", claimed.size()));
                    
        } catch (Exception e) {
            claimed.forEach(item -> deduplicator.release(item.eventId()));
            channel.basicNack(lastTag, true, false);
            logger.error("Error processing team batch",
                    keyValue("action", "team_index_batch_upsert_error"),
                    keyValue("count", claimed.size()),
                    e);
        }
    }

    @RabbitListener(queues = RabbitMQConfig.TEAM_UPSERT_QUEUE_SEARCH_V2, containerFactory = "rabbitV2BatchFactory",
            autoStartup = "${blockout.events.consumers.lifecycle-v2-enabled:false}")
    public void onUpsertBatchV2(List<org.springframework.amqp.core.Message> messages, Channel channel)
            throws IOException {
        long lastTag = messages.get(messages.size() - 1).getMessageProperties().getDeliveryTag();
        List<Claimed<TeamUpsertEvent>> claimed = new ArrayList<>();
        try {
            for (org.springframework.amqp.core.Message message : messages) {
                var decoded = decoder.teamUpsert(message);
                if (deduplicator.tryClaim(decoded.eventId(), decoded.eventType(), "v2")) {
                    claimed.add(new Claimed<>(decoded.eventId(), decoded.projectionEvent()));
                }
            }
            if (!claimed.isEmpty()) {
                teamIndexService.upsertBatch(claimed.stream().map(Claimed::event).toList());
            }
            claimed.forEach(item -> deduplicator.complete(item.eventId(), "TEAM_UPSERT", "v2"));
            channel.basicAck(lastTag, true);
        } catch (Exception exception) {
            claimed.forEach(item -> deduplicator.release(item.eventId()));
            channel.basicNack(lastTag, true, false);
            logger.error("Error processing canonical team batch",
                    keyValue("action", "team_v2_index_batch_upsert_error"),
                    keyValue("count", messages.size()), exception);
        }
    }

    private List<Claimed<TeamUpsertEvent>> claimLegacy(List<Message<TeamUpsertEvent>> messages) {
        List<Claimed<TeamUpsertEvent>> claimed = new ArrayList<>();
        for (Message<TeamUpsertEvent> message : messages) {
            UUID eventId = deduplicator.legacyEventId(message.getHeaders().get("x-blockout-event-id"));
            if (deduplicator.tryClaim(eventId, "TEAM_UPSERT", "v1")) {
                claimed.add(new Claimed<>(eventId, message.getPayload()));
            }
        }
        return claimed;
    }

    private record Claimed<T>(UUID eventId, T event) {}
}
