package com.blockout.search.team.application;

import com.blockout.search.shared.application.FilteredSearchQuery;
import java.util.List;

/** Reads the worker-owned team search index without exposing store documents. */
public interface TeamSearchStore {

    List<TeamSearchView> search(FilteredSearchQuery query) throws Exception;
}
