package com.blockout.mobilegateway.models.dto.match;

import com.blockout.mobilegateway.models.enums.LiveProvider;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkRequestDTO {
    private LiveProvider provider;
    private String url;
}