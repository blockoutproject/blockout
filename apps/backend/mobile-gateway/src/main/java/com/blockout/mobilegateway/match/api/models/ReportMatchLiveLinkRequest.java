package com.blockout.mobilegateway.match.api.models;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportMatchLiveLinkRequest {
    private String reason;
}