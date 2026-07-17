package com.blockout.search.pool.application;

import com.blockout.search.shared.application.SearchFilters;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Owns the current pool search fallback policy. */
@Service
@RequiredArgsConstructor
public class PoolSearchService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PoolSearchService.class);

    private final PoolSearchStore store;

    public List<PoolSearchResult> search(SearchFilters filters) {
        try {
            return store.search(filters);
        } catch (Exception exception) {
            LOGGER.error("Error autocompleting pools: {}", exception.getMessage());
            return Collections.emptyList();
        }
    }
}
