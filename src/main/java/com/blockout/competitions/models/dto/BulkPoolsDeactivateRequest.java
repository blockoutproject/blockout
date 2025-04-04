package com.blockout.competitions.models.dto;

import lombok.Data;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class BulkPoolsDeactivateRequest {

    /**
     * Liste de tous les pool_ids encore présents selon le scrapper.
     * Ceux qui ne sont pas dedans doivent être désactivés.
     */
    @JsonProperty("missing_pool_ids")
    private List<Long> missingPoolIds;
}