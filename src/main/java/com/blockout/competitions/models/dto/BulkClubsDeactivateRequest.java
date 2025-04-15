package com.blockout.competitions.models.dto;

import lombok.Data;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class BulkClubsDeactivateRequest {

    /**
     * Liste de tous les club_ids encore présents selon le scrapper.
     * Ceux qui ne sont pas dedans doivent être désactivés.
     */
    @JsonProperty("missing_club_ids")
    private List<String> missingClubIds;
}