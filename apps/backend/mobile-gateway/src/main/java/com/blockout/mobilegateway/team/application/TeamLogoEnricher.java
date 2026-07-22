package com.blockout.mobilegateway.team.application;

import com.blockout.mobilegateway.club.application.views.ClubView;
import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import com.blockout.mobilegateway.team.application.views.TeamDetailsView;
import org.apache.commons.lang3.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

public final class TeamLogoEnricher {

    private TeamLogoEnricher() {
    }

    public static Map<String, ClubView> enrichTeamsWithClubData(
        Collection<TeamDetailsView> teams, ClubInternalClient clubInternalClient) {
        if (teams == null || teams.isEmpty()) return Collections.emptyMap();

        Set<String> clubIds = teams.stream()
            .map(TeamDetailsView::getClubId)
            .filter(StringUtils::isNotBlank)
            .collect(Collectors.toSet());

        if (clubIds.isEmpty()) return Collections.emptyMap();

        Map<String, ClubView> clubById = new HashMap<>(clubIds.size() * 2);

        for (String clubId : clubIds) {
            ClubView club = clubInternalClient.getClubById(clubId);
            if (club != null) {
                clubById.put(clubId, club);
            }
        }

        for (TeamDetailsView team : teams) {
            if (team == null) continue;

            String clubId = team.getClubId();
            if (StringUtils.isBlank(clubId)) continue;

            ClubView club = clubById.get(clubId);
            if (club == null) continue;

            if (StringUtils.isBlank(team.getLogoUrl()) && StringUtils.isNotBlank(club.logoUrl())) {
                team.setLogoUrl(club.logoUrl());
            }

        }

        return clubById;
    }
}
