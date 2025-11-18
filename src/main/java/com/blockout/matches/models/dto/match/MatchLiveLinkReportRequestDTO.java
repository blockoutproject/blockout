package com.blockout.matches.models.dto.match;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class MatchLiveLinkReportRequestDTO {
    private String reason;
}