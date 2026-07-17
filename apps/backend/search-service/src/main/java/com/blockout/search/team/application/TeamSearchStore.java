package com.blockout.search.team.application;

import com.blockout.search.shared.application.SearchFilters;
import java.util.List;

/** Reads the worker-owned team search index without exposing store documents. */
public interface TeamSearchStore {

    List<TeamSearchResult> search(SearchFilters filters) throws Exception;
}
