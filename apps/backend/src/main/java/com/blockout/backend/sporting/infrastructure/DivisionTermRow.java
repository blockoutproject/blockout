package com.blockout.backend.sporting.infrastructure;

import java.util.UUID;

/** Search vocabulary keyed by its division without selecting image bytes. */
record DivisionTermRow(UUID divisionId, String term) {}
