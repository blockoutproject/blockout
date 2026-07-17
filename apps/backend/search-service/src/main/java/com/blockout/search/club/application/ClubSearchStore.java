package com.blockout.search.club.application;

import java.util.List;

/** Reads the worker-owned club search index without exposing store documents. */
public interface ClubSearchStore {

    List<ClubSearchResult> search(String query) throws Exception;
}
