package com.blockout.matches.models.dto;

import lombok.Data;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class BulkMatchesDeactivateRequest {
    /**
     * Liste des matchCodes qui sont encore présents dans la poule 
     * selon le scraping.
     */
    @JsonProperty("missing_match_codes")
    private List<String> missingMatchCodes;
}