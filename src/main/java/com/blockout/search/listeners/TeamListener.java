package com.blockout.search.listeners;

import java.io.IOException;
import java.util.List;

import com.blockout.search.config.RabbitMQConfig;
import com.blockout.search.models.events.TeamUpsertEvent;
import com.blockout.search.services.index.TeamIndexService;
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
public class TeamListener {

    private static final Logger logger = LoggerFactory.getLogger(TeamListener.class);

    private final TeamIndexService teamIndexService;

    @RabbitListener(queues = RabbitMQConfig.TEAM_LIFECYCLE_QUEUE_SEARCH, containerFactory = "rabbitBatchFactory")
    public void onUpsertBatch(List<Message<TeamUpsertEvent>> messages, Channel channel) throws IOException {
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
                    keyValue("action", "acknowledge_team_batch"),
                    keyValue("count", events.size()));
        } catch (Exception e) {
            channel.basicNack(lastTag, true, false);

            logger.error("Error processing team batch",
                    keyValue("action", "error_team_batch"),
                    keyValue("count", events.size()),
                    e);
        }
    }
}