package com.blockout.mobilegateway.models.dto.match;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkRequestDTO {
    private String url;
}