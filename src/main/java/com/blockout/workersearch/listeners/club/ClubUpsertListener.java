package com.blockout.workersearch.listeners.club;

import java.io.IOException;
import java.util.List;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.services.index.ClubIndexService;
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
public class ClubUpsertListener {

    private static final Logger logger = LoggerFactory.getLogger(ClubUpsertListener.class);

    private final ClubIndexService clubIndexService;

    @RabbitListener(queues = RabbitMQConfig.CLUB_UPSERT_QUEUE_SEARCH, containerFactory = "rabbitBatchFactory")
    public void handleUpsertBatch(List<Message<ClubUpsertEvent>> messages, Channel channel) throws IOException {
        List<ClubUpsertEvent> events = messages.stream()
                .map(Message::getPayload)
                .toList();

        Long lastTag = (Long) messages.get(messages.size() - 1).getHeaders().get(AmqpHeaders.DELIVERY_TAG);

        logger.info("Received batch of ClubUpsertEvent",
                keyValue("action", "receive_club_batch"),
                keyValue("count", events.size()));

        try {
            clubIndexService.upsertBatch(events);
            channel.basicAck(lastTag, true);

            logger.info("Successfully processed and acknowledged club batch",
                    keyValue("action", "club_index_batch_upsert"),
                    keyValue("count", events.size()));

        } catch (Exception e) {
            channel.basicNack(lastTag, true, false);
            logger.error("Error processing club batch",
                    keyValue("action", "club_index_batch_upsert_error"),
                    keyValue("count", events.size()),
                    e);
        }
    }
}