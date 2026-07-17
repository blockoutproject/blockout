package com.blockout.search.team.application;

import com.blockout.search.shared.application.SearchFilters;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Owns the current team search fallback policy. */
@Service
@RequiredArgsConstructor
public class TeamSearchService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TeamSearchService.class);

    private final TeamSearchStore store;

    public List<TeamSearchResult> search(SearchFilters filters) {
        try {
            return store.search(filters);
        } catch (Exception exception) {
            LOGGER.error("Error autocompleting teams: {}", exception.getMessage());
            return Collections.emptyList();
        }
    }
}
