package com.blockout.matches.models.dto;

import lombok.Data;
import java.util.List;

@Data
public class BulkMatchesDeactivateRequest {
    /**
     * Liste des matchCodes qui sont encore présents dans la poule 
     * selon le scraping.
     */
    private List<String> missingMatchCodes;
}