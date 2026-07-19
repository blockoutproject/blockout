package com.blockout.mobilegateway.models.dto.match;

import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.enums.LiveProvider;
import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedMatchDTO {
    private Long id;

    private Long liveCode;

    private String matchDate;

    private String season;

    private String set;

    private String score;

    private String status;

    private String venue;

    private String firstReferee;

    private String secondReferee;

    private String liveUrl;

    private LiveProvider liveProvider;

    private String liveOwnerAuth0Id;

    private TeamDTO teamA;

    private TeamDTO teamB;

    private String matchAddressPdfUrl;

    private String matchSheetPdfUrl;

    private EnrichedPoolDTO pool;
}