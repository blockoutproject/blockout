package com.blockout.search.club.application;

import com.blockout.search.shared.application.SearchQuery;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Owns the current club search fallback policy. */
@Service
@RequiredArgsConstructor
public class ClubSearchService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ClubSearchService.class);

    private final ClubSearchStore store;

    public List<ClubSearchView> search(SearchQuery query) {
        try {
            return store.search(query);
        } catch (Exception exception) {
            LOGGER.error("Error autocompleting clubs: {}", exception.getMessage());
            return Collections.emptyList();
        }
    }
}
