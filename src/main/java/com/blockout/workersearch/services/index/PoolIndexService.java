package com.blockout.workersearch.services.index;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.docs.PoolDoc;
import com.blockout.workersearch.models.events.PoolUpsertEvent;
import com.blockout.workersearch.repositories.PoolRepository;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class PoolIndexService {

    private static final Logger logger = LoggerFactory.getLogger(PoolIndexService.class);

    private final PoolRepository poolRepository;

    public void upsert(PoolUpsertEvent e) {
        PoolDoc doc = map(e);
        logger.info("Upserting single pool",
                keyValue("action", "upsert_pool"),
                keyValue("poolId", doc.getPoolId()),
                keyValue("poolName", doc.getPoolName()));
        poolRepository.save(doc);
    }

    public void upsertBatch(List<PoolUpsertEvent> events) {
        List<PoolDoc> docs = events.stream().map(this::map).toList();

        logger.info("Upserting batch of pools",
                keyValue("action", "upsert_pool_batch"),
                keyValue("count", docs.size()));

        docs.forEach(doc -> logger.debug("Prepared PoolDoc",
                keyValue("poolId", doc.getPoolId()),
                keyValue("division", doc.getDivisionName()),
                keyValue("poolName", doc.getPoolName())));

        poolRepository.saveAll(docs);
    }

    public void delete(Long id) {
        logger.info("Deleting pool",
                keyValue("action", "delete_pool"),
                keyValue("poolId", id));
        poolRepository.deleteById(id);
    }

    private PoolDoc map(PoolUpsertEvent e) {
        PoolDoc doc = PoolDoc.builder()
                .poolId(e.getPoolId())
                .divisionName(e.getDivisionName())
                .poolName(e.getPoolName())
                .build();

        logger.debug("Mapped PoolUpsertEvent to PoolDoc",
                keyValue("action", "map_pool_event"),
                keyValue("poolId", doc.getPoolId()),
                keyValue("division", doc.getDivisionName()),
                keyValue("poolName", doc.getPoolName()));

        return doc;
    }
}