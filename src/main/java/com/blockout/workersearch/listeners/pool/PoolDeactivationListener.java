package com.blockout.workersearch.listeners.pool;

import com.blockout.workersearch.config.RabbitMQConfig;
import com.blockout.workersearch.models.events.PoolDeactivationEvent;
import com.blockout.workersearch.services.index.PoolIndexService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class PoolDeactivationListener {

    private static final Logger logger = LoggerFactory.getLogger(PoolDeactivationListener.class);
    private final PoolIndexService poolIndexService;

    @RabbitListener(queues = RabbitMQConfig.POOL_DEACTIVATION_QUEUE_SEARCH)
    public void handlePoolDeactivation(PoolDeactivationEvent event) {
        Long poolId = event.getPoolId();
        logger.info("Received pool deactivation event",
                keyValue("action", "pool_deactivated"),
                keyValue("poolId", poolId));

        poolIndexService.delete(poolId);

        logger.info("Pool deleted from index",
                keyValue("action", "pool_index_delete"),
                keyValue("poolId", poolId));
    }
}