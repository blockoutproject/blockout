package com.blockout.mobilegateway.models.dto.match;

import java.util.List;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedDayPageDTO {

    private List<EnrichedDayMatchesDTO> dayMatches;

    private boolean hasNext;

    private Integer nextPage;
}