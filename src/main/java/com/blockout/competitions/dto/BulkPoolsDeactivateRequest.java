package com.blockout.competitions.dto;

import lombok.Data;
import java.util.List;

import com.blockout.competitions.models.Category;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class BulkPoolsDeactivateRequest {

    /**
     * Liste de tous les pool_ids encore présents selon le scrapper.
     * Ceux qui ne sont pas dedans doivent être désactivés.
     */
    @JsonProperty("scraped_pool_ids")
    private List<Long> scrapedPoolIds;

    /**
     * Catégorie des pools à désactiver.
     */
    private Category category;
}