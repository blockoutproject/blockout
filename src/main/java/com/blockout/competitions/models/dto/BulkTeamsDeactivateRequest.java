package com.blockout.competitions.models.dto;

import lombok.Data;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class BulkTeamsDeactivateRequest {
    /**
     * Liste des teamIds qui sont encore présents dans la poule 
     * selon le scraping.
     */
    @JsonProperty("missing_team_ids")
    private List<Long> missingTeamIds;
}