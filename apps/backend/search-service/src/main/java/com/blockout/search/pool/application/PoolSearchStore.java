package com.blockout.search.pool.application;

import com.blockout.search.shared.application.SearchFilters;
import java.util.List;

/** Reads the worker-owned pool search index without exposing store documents. */
public interface PoolSearchStore {

    List<PoolSearchResult> search(SearchFilters filters) throws Exception;
}
