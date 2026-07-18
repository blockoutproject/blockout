package com.blockout.workersearch.services.jobs;

import com.blockout.workersearch.projection.index.application.SearchIndexRebuilder;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class IndexerJob {

    private final SearchIndexRebuilder indexRebuilder;

    @Scheduled(fixedRate = 3600000)
    public void reindexAll() {
        indexRebuilder.rebuildAll();
    }
}
