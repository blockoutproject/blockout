package com.blockout.search.search.api;

import com.blockout.search.search.api.mappers.SearchApiMapper;
import com.blockout.search.search.api.models.ClubSearchInternalResponse;
import com.blockout.search.search.application.SearchApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Implements the generated V1 internal Club search API. */
@RestController
@RequiredArgsConstructor
public class ClubSearchController implements ClubSearchApi {

    private final SearchApplicationService searchApplicationService;
    private final SearchApiMapper mapper;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<List<ClubSearchInternalResponse>> searchClubs(String query) {
        return ResponseEntity.ok(
            searchApplicationService.searchClubs(query).stream()
                .map(mapper::toInternalResponse)
                .toList());
    }
}
