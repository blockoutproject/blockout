package com.blockout.mobilegateway.match.application.commands;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportMatchLiveLinkCommand {
    private String reason;
}
