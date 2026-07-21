package com.blockout.search.search.application;

import com.blockout.search.search.application.ports.SearchReader;
import com.blockout.search.search.application.queries.FilteredSearchQuery;
import com.blockout.search.search.application.views.ClubSearchResult;
import com.blockout.search.search.application.views.PoolSearchResult;
import com.blockout.search.search.application.views.TeamSearchResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchApplicationService {

    private final SearchReader searchReader;

    public List<ClubSearchResult> searchClubs(String query) {
        return searchReader.searchClubs(query);
    }

    public List<TeamSearchResult> searchTeams(FilteredSearchQuery query) {
        return searchReader.searchTeams(query);
    }

    public List<PoolSearchResult> searchPools(FilteredSearchQuery query) {
        return searchReader.searchPools(query);
    }
}
