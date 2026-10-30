package com.blockout.backend.search.application;

import java.util.UUID;

/** Native score/UUID position; it grants no authority and carries no duplicated search context. */
public record SearchContinuation(Double score, UUID id) {}
