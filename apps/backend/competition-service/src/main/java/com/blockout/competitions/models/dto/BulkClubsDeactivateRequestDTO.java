package com.blockout.competitions.models.dto;

import lombok.Data;
import java.util.List;

@Data
public class BulkClubsDeactivateRequestDTO {

    /**
     * Liste de tous les club_ids encore présents selon le scrapper.
     * Ceux qui ne sont pas dedans doivent être désactivés.
     */
    private List<String> missingClubIds;
}