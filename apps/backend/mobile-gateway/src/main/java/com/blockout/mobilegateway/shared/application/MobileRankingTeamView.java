package com.blockout.mobilegateway.shared.application;

public record MobileRankingTeamView(
        Long id,
        String shortName,
        String logoUrl,
        Integer points,
        Integer played,
        Integer wins,
        Integer losses,
        Double latitude,
        Double longitude) {
}
