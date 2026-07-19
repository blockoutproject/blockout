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
public class DayPageResponse {

    private List<DayMatchesResponse> dayMatches;

    private boolean hasNext;

    private Integer nextPage;
}