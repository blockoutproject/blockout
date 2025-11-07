package com.blockout.competitions.models.dto;

import lombok.Data;
import java.util.List;

@Data
public class BulkPoolsDeactivateRequestDTO {

    /**
     * Liste de tous les pool_ids encore présents selon le scrapper.
     * Ceux qui ne sont pas dedans doivent être désactivés.
     */
    private List<Long> missingPoolIds;
}