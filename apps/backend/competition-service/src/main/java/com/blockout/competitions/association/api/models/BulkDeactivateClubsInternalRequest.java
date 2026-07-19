package com.blockout.competitions.association.api.models;

import java.util.List;

public record BulkDeactivateClubsInternalRequest(List<String> missingClubIds) {
}
