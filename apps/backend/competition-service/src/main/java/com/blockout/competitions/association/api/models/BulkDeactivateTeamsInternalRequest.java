package com.blockout.competitions.association.api.models;

import java.util.List;

public record BulkDeactivateTeamsInternalRequest(List<Long> missingTeamIds) {
}
