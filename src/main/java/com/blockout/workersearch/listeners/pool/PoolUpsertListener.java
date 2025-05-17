package com.blockout.workersearch.listeners.pool;

import java.io.IOException;
import java.util.List;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.models.events.PoolUpsertEvent;
import com.blockout.workersearch.services.index.PoolIndexService;
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
public class PoolUpsertListener {

    private static final Logger logger = LoggerFactory.getLogger(PoolUpsertListener.class);

    private final PoolIndexService poolIndexService;

    @RabbitListener(queues = RabbitMQConfig.POOL_LIFECYCLE_QUEUE_SEARCH, containerFactory = "rabbitBatchFactory")
    public void onUpsertBatch(List<Message<PoolUpsertEvent>> messages, Channel channel) throws IOException {
        List<PoolUpsertEvent> events = messages.stream()
                .map(Message::getPayload)
                .toList();

        Long lastTag = (Long) messages.get(messages.size() - 1).getHeaders().get(AmqpHeaders.DELIVERY_TAG);

        logger.info("Received batch of PoolUpsertEvent",
                keyValue("action", "receive_pool_batch"),
                keyValue("count", events.size()));

        try {
            poolIndexService.upsertBatch(events);
            channel.basicAck(lastTag, true);

            logger.info("Successfully processed and acknowledged pool batch",
                    keyValue("action", "acknowledge_pool_batch"),
                    keyValue("count", events.size()));
        } catch (Exception e) {
            channel.basicNack(lastTag, true, false);

            logger.error("Error processing pool batch",
                    keyValue("action", "error_pool_batch"),
                    keyValue("count", events.size()),
                    e);
        }
    }
}