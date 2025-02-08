package com.blockout.competitions.models.dto;

import lombok.Data;

@Data
public class TeamAssociationStatsRequest {
    private Integer played;
    private Integer wins;
    private Integer losses;
    private Integer points;
}