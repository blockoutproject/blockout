package com.blockout.mobilegateway.utils;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.services.clients.ClubClientService;
import org.apache.commons.lang3.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

public final class TeamLogoEnricher {

    private TeamLogoEnricher() {}

    public static void enrichTeamsWithClubData(Collection<TeamDTO> teams, ClubClientService clubClientService) {
        if (teams == null || teams.isEmpty()) return;

        Set<String> clubIds = teams.stream()
                .map(TeamDTO::getClubId)
                .filter(StringUtils::isNotBlank)
                .collect(Collectors.toSet());

        if (clubIds.isEmpty()) return;

        Map<String, ClubDTO> clubById = new HashMap<>(clubIds.size() * 2);

        for (String clubId : clubIds) {
            ClubDTO club = clubClientService.getClubById(clubId);
            if (club != null) {
                clubById.put(clubId, club);
            }
        }

        for (TeamDTO team : teams) {
            if (team == null) continue;

            String clubId = team.getClubId();
            if (StringUtils.isBlank(clubId)) continue;

            ClubDTO club = clubById.get(clubId);
            if (club == null) continue;

            if (StringUtils.isBlank(team.getLogoUrl()) && StringUtils.isNotBlank(club.getLogoUrl())) {
                team.setLogoUrl(club.getLogoUrl());
            }

            team.setLatitude(club.getLatitude());
            team.setLongitude(club.getLongitude());
        }
    }
}