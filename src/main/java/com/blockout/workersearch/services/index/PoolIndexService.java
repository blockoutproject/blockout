package com.blockout.workersearch.services.index;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.docs.PoolDoc;
import com.blockout.workersearch.models.events.DivisionUpsertEvent;
import com.blockout.workersearch.models.events.PoolUpsertEvent;
import com.blockout.workersearch.repositories.PoolRepository;
import com.blockout.workersearch.services.caches.ConfigCacheService;
import com.blockout.workersearch.utils.TextNormalizer;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class PoolIndexService {

    private static final Logger logger = LoggerFactory.getLogger(PoolIndexService.class);

    private final PoolRepository poolRepository;
    private final ConfigCacheService configCacheService;

    public void upsert(PoolUpsertEvent e) {
        PoolDoc doc = map(e);
        logger.info("Upserting single pool",
                keyValue("action", "upsert_pool"),
                keyValue("id", doc.getId()),
                keyValue("name", doc.getName()));
        poolRepository.save(doc);
    }

    public void upsertBatch(List<PoolUpsertEvent> events) {
        List<PoolDoc> docs = events.stream().map(this::map).toList();

        logger.info("Upserting batch of pools",
                keyValue("action", "upsert_pool_batch"),
                keyValue("count", docs.size()));
        poolRepository.saveAll(docs);
    }

    public void delete(Long id) {
        logger.info("Deleting pool",
                keyValue("action", "delete_pool"),
                keyValue("id", id));
        poolRepository.deleteById(id);
    }

    private PoolDoc map(PoolUpsertEvent e) {
        DivisionUpsertEvent division = configCacheService.getDivisionById(e.getDivisionId());
        String divisionName = division != null ? division.getName() : "Division inconnue";

        // Contenu brut (comme Team: concat utile pour la recherche)
        String raw = String.join(" ",
                e.getName() != null ? e.getName() : "",
                divisionName != null ? divisionName : "",
                e.getLeagueName() != null ? e.getLeagueName() : "",
                e.getSeason() != null ? e.getSeason() : "");

        // Version simplifiée
        String simplified = TextNormalizer.simplify(raw);

        return PoolDoc.builder()
                .id(e.getId())
                .name(e.getName())
                .divisionName(divisionName)
                .leagueName(e.getLeagueName())
                .season(e.getSeason())
                .keywordsAutocomplete(raw)
                .keywordsAutocompleteSimplified(simplified)
                .build();
    }
}