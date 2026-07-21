package com.blockout.mobilegateway.team.application;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import com.blockout.mobilegateway.team.api.models.TeamInternalResponse;
import org.apache.commons.lang3.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

public final class TeamLogoEnricher {

    private TeamLogoEnricher() {
    }

    public static Map<String, ClubResponse> enrichTeamsWithClubData(
        Collection<TeamInternalResponse> teams, ClubInternalClient clubInternalClient) {
        if (teams == null || teams.isEmpty()) return Collections.emptyMap();

        Set<String> clubIds = teams.stream()
            .map(TeamInternalResponse::getClubId)
            .filter(StringUtils::isNotBlank)
            .collect(Collectors.toSet());

        if (clubIds.isEmpty()) return Collections.emptyMap();

        Map<String, ClubResponse> clubById = new HashMap<>(clubIds.size() * 2);

        for (String clubId : clubIds) {
            ClubResponse club = clubInternalClient.getClubById(clubId);
            if (club != null) {
                clubById.put(clubId, club);
            }
        }

        for (TeamInternalResponse team : teams) {
            if (team == null) continue;

            String clubId = team.getClubId();
            if (StringUtils.isBlank(clubId)) continue;

            ClubResponse club = clubById.get(clubId);
            if (club == null) continue;

            if (StringUtils.isBlank(team.getLogoUrl()) && StringUtils.isNotBlank(club.getLogoUrl())) {
                team.setLogoUrl(club.getLogoUrl());
            }

        }

        return clubById;
    }
}
