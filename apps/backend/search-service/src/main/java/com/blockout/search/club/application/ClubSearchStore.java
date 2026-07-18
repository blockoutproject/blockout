package com.blockout.search.club.application;

import com.blockout.search.shared.application.SearchQuery;
import java.util.List;

/** Reads the worker-owned club search index without exposing store documents. */
public interface ClubSearchStore {

    List<ClubSearchView> search(SearchQuery query) throws Exception;
}
