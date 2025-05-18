package com.blockout.workersearch.listeners.team;

import java.io.IOException;
import java.util.List;

import com.blockout.workersearch.config.RabbitMQConfig;
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

    @RabbitListener(queues = RabbitMQConfig.TEAM_UPSERT_QUEUE_SEARCH, containerFactory = "rabbitBatchFactory")
    public void handleUpsertBatch(List<Message<TeamUpsertEvent>> messages, Channel channel) throws IOException {
        List<TeamUpsertEvent> events = messages.stream()
                .map(Message::getPayload)
                .toList();

        Long lastTag = (Long) messages.get(messages.size() - 1).getHeaders().get(AmqpHeaders.DELIVERY_TAG);

        logger.info("Received batch of TeamUpsertEvent",
                keyValue("action", "receive_team_batch"),
                keyValue("count", events.size()));

        try {
            teamIndexService.upsertBatch(events);
            channel.basicAck(lastTag, true);

            logger.info("Successfully processed and acknowledged team batch",
                    keyValue("action", "team_index_batch_upsert"),
                    keyValue("count", events.size()));

        } catch (Exception e) {
            channel.basicNack(lastTag, true, false);
            logger.error("Error processing team batch",
                    keyValue("action", "team_index_batch_upsert_error"),
                    keyValue("count", events.size()),
                    e);
        }
    }
}