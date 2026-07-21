package com.blockout.mobilegateway.match.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayPageInternalResponse {

    private List<DayMatchesInternalResponse> dayMatches;

    private boolean hasNext;

    private Integer nextPage;
}
