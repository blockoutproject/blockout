package com.blockout.pools.pool.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.pools.shared.application.ChangeLog;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PoolService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PoolService.class);

    private final PoolStore store;
    private final PoolEventPublisher eventPublisher;

    @Transactional
    public PoolView create(CreatePoolCommand command) {
        return publishCreated(store.create(command));
    }

    @Transactional
    public PoolView createLegacy(LegacyCreatePoolCommand command) {
        return publishCreated(store.createLegacy(command));
    }

    @Transactional(readOnly = true)
    public PoolView getById(Long id) {
        return store.findById(id).orElseThrow(() -> notFound(id));
    }

    @Transactional(readOnly = true)
    public List<PoolView> findLegacy(PoolFilter filter) {
        return store.findLegacy(filter);
    }

    @Transactional(readOnly = true)
    public PoolPage findPage(PoolFilter filter, int page, int pageSize) {
        return store.findPage(filter, page, pageSize);
    }

    @Transactional
    public PoolView update(Long id, UpdatePoolCommand command) {
        PoolUpdate update = store.findForUpdate(id).orElseThrow(() -> notFound(id));
        PoolChange change = update.apply(new PoolUpdatePlan(command));
        if (Boolean.FALSE.equals(change.before().active()) && Boolean.TRUE.equals(change.after().active())) {
            LOGGER.info("Pool reactivated", keyValue("action", "reactivate_pool"), keyValue("poolId", id),
                    keyValue("leagueCode", change.after().leagueCode()), keyValue("name", change.after().name()));
        }
        ChangeLog.logChanges(change.before(), change.after(), LOGGER, "update_pool", change.after().id());
        PoolEventData event = PoolEventData.from(change.after());
        eventPublisher.publishUpsert(event);
        eventPublisher.publishProjection(event);
        return change.after();
    }

    private PoolView publishCreated(PoolView view) {
        LOGGER.info("Pool created successfully", keyValue("action", "create_pool"), keyValue("poolId", view.id()));
        PoolEventData event = PoolEventData.from(view);
        eventPublisher.publishUpsert(event);
        eventPublisher.publishProjection(event);
        return view;
    }

    private PoolNotFoundException notFound(Long id) {
        LOGGER.warn("Pool not found", keyValue("action", "get_pool_by_id"), keyValue("poolId", id));
        return new PoolNotFoundException(id);
    }
}
