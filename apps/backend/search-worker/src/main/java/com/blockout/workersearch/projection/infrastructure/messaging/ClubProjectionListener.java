package com.blockout.workersearch.projection.infrastructure.messaging;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.projection.application.SearchProjectionService;
import com.blockout.workersearch.projection.application.models.ClubProjectionSource;
import com.blockout.workersearch.projection.infrastructure.messaging.messages.ClubDeactivationMessage;
import com.blockout.workersearch.projection.infrastructure.messaging.messages.ClubUpsertMessage;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class ClubProjectionListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(ClubProjectionListener.class);

    private final SearchProjectionService searchProjectionService;

    @RabbitListener(queues = RabbitMQConfig.CLUB_UPSERT_QUEUE_SEARCH, containerFactory = "rabbitBatchFactory")
    public void onUpsertBatch(List<Message<ClubUpsertMessage>> messages, Channel channel) throws IOException {
        long lastTag = deliveryTag(messages);
        var clubs = messages.stream()
            .map(Message::getPayload)
            .map(message -> new ClubProjectionSource(
                message.id(), message.name(), message.logoUrl(), message.city()))
            .toList();
        try {
            searchProjectionService.upsertClubs(clubs);
            channel.basicAck(lastTag, true);
            LOGGER.info(
                "Processed club batch",
                keyValue("action", "club_index_batch_upsert"),
                keyValue("count", clubs.size()));
        } catch (Exception exception) {
            channel.basicNack(lastTag, true, false);
            LOGGER.error("Error processing club batch", keyValue("count", clubs.size()), exception);
        }
    }

    @RabbitListener(queues = RabbitMQConfig.CLUB_DEACTIVATION_QUEUE_SEARCH)
    public void onDeactivation(ClubDeactivationMessage message) {
        searchProjectionService.deactivateClub(message.clubId());
        LOGGER.info(
            "Club deleted from index",
            keyValue("action", "club_index_delete"),
            keyValue("clubId", message.clubId()));
    }

    private long deliveryTag(List<? extends Message<?>> messages) {
        return (Long) messages.get(messages.size() - 1).getHeaders().get(AmqpHeaders.DELIVERY_TAG);
    }
}
