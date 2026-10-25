package com.blockout.backend.search.application;

import java.util.UUID;

/**
 * Native score/UUID boundary with exact normalized selection binding; never an access credential.
 */
public record SearchContinuation(SearchContext context, Double score, UUID id) {}
