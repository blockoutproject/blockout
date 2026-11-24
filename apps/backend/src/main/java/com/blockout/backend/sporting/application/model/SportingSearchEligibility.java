package com.blockout.backend.sporting.application.model;

import java.util.UUID;

/**
 * Current facts for matching a visible search candidate against its indexed city and exact filters.
 */
public record SportingSearchEligibility(
    UUID id, UUID seasonId, SportingClassification classification, String city) {}
