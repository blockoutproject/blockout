package com.blockout.mobilegateway.models.dto.match;

import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class EnrichedMatchDTO extends MatchDTO {
    @JsonProperty("team_a")
    private TeamDTO teamA;

    @JsonProperty("team_b")
    private TeamDTO teamB;

    private EnrichedPoolDTO pool;
}