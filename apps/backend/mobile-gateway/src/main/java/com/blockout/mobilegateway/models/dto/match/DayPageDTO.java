package com.blockout.mobilegateway.models.dto.match;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayPageDTO {

    @JsonProperty("day_matches")
    private List<DayMatchesDTO> dayMatches;

    @JsonProperty("has_next")
    private boolean hasNext;

    @JsonProperty("next_page")
    private Integer nextPage;
}