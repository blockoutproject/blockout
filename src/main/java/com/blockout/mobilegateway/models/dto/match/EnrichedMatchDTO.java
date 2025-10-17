package com.blockout.mobilegateway.models.dto.match;

import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

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

    @JsonProperty("live_code")
    private Long liveCode;

    @JsonProperty("match_date")
    private String matchDate;

    private String season;

    private String set;

    private String score;

    private String status;
    
    private String venue;

    @JsonProperty("first_referee")
    private String firstReferee;

    @JsonProperty("second_referee")
    private String secondReferee;
    
    @JsonProperty("team_a")
    private TeamDTO teamA;

    @JsonProperty("team_b")
    private TeamDTO teamB;

    @JsonProperty("match_address_pdf_url")
    private String matchAddressPdfUrl;

    @JsonProperty("match_sheet_pdf_url")
    private String matchSheetPdfUrl;

    private EnrichedPoolDTO pool;
}