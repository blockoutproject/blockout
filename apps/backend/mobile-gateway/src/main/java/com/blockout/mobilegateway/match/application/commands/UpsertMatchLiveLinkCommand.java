package com.blockout.mobilegateway.match.application.commands;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpsertMatchLiveLinkCommand {
    private String url;
}
