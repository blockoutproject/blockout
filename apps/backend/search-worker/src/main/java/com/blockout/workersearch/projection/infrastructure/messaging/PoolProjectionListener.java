package com.blockout.workersearch.projection.infrastructure.messaging;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.projection.application.SearchProjectionService;
import com.blockout.workersearch.projection.application.models.PoolProjectionSource;
import com.blockout.workersearch.projection.infrastructure.messaging.messages.PoolDeactivationMessage;
import com.blockout.workersearch.projection.infrastructure.messaging.messages.PoolUpsertMessage;
import com.rabbitmq.client.Channel;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PoolProjectionListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(PoolProjectionListener.class);

    private final SearchProjectionService searchProjectionService;

    @RabbitListener(queues = RabbitMQConfig.POOL_UPSERT_QUEUE_SEARCH, containerFactory = "rabbitBatchFactory")
    public void onUpsertBatch(List<Message<PoolUpsertMessage>> messages, Channel channel) throws IOException {
        long lastTag = deliveryTag(messages);
        var pools = messages.stream()
                .map(Message::getPayload)
                .map(message -> new PoolProjectionSource(
                        message.id(), message.name(), message.shortName(), message.divisionId(),
                        message.leagueCode(),
                        message.leagueName(),
                        message.season(),
                        message.format(),
                        message.gender()))
                .toList();
        try {
            searchProjectionService.upsertPools(pools);
            channel.basicAck(lastTag, true);
            LOGGER.info(
                    "Processed pool batch",
                    keyValue("action", "pool_index_batch_upsert"),
                    keyValue("count", pools.size()));
        } catch (Exception exception) {
            channel.basicNack(lastTag, true, false);
            LOGGER.error("Error processing pool batch", keyValue("count", pools.size()), exception);
        }
    }

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATION_QUEUE_SEARCH)
    public void onDeactivation(PoolDeactivationMessage message) {
        searchProjectionService.deactivatePool(message.poolId());
        LOGGER.info(
                "Pool deleted from index",
                keyValue("action", "pool_index_delete"),
                keyValue("poolId", message.poolId()));
    }

    private long deliveryTag(List<? extends Message<?>> messages) {
        return (Long) messages.get(messages.size() - 1).getHeaders().get(AmqpHeaders.DELIVERY_TAG);
    }
}
