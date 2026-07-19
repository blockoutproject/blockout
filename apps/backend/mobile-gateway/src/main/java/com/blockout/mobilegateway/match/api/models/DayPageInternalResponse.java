package com.blockout.mobilegateway.match.api.models;

import java.util.List;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayPageInternalResponse {

    private List<DayMatchesInternalResponse> dayMatches;

    private boolean hasNext;

    private Integer nextPage;
}