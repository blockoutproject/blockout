package com.blockout.search.search.application.ports;

import com.blockout.search.search.application.queries.FilteredSearchQuery;
import com.blockout.search.search.application.views.ClubSearchResult;
import com.blockout.search.search.application.views.PoolSearchResult;
import com.blockout.search.search.application.views.TeamSearchResult;
import java.util.List;

public interface SearchReader {
    List<ClubSearchResult> searchClubs(String query);

    List<TeamSearchResult> searchTeams(FilteredSearchQuery query);

    List<PoolSearchResult> searchPools(FilteredSearchQuery query);
}
