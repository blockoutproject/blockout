package com.blockout.competitions.association.api.models;

import java.util.List;

public record BulkDeactivatePoolsInternalRequest(List<Long> missingPoolIds) {
}
