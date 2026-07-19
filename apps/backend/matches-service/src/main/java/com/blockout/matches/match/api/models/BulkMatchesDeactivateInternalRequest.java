package com.blockout.matches.match.api.models;

import java.util.List;

public record BulkMatchesDeactivateInternalRequest(List<String> missingMatchCodes) {
}
