package com.blockout.competitions.models.dto;

import lombok.Data;
import java.util.List;

@Data
public class BulkTeamsDeactivateRequest {
    /**
     * Liste des teamIds qui sont encore présents dans la poule 
     * selon le scraping.
     */
    private List<Long> missingTeamIds;
}