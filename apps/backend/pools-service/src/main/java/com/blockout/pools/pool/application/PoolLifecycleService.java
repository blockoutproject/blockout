package com.blockout.pools.pool.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PoolLifecycleService {
    private static final Logger LOGGER = LoggerFactory.getLogger(PoolLifecycleService.class);
    private final PoolLifecycleStore store;

    @Transactional
    public void deactivate(Long id) {
        if (!store.deactivate(id)) {
            throw notFound(id);
        }
        LOGGER.info("Pool successfully deactivated", keyValue("action", "deactivate_pool"), keyValue("poolId", id));
    }

    private PoolNotFoundException notFound(Long id) {
        LOGGER.warn("Pool not found", keyValue("action", "get_pool_by_id"), keyValue("poolId", id));
        return new PoolNotFoundException(id);
    }
}
