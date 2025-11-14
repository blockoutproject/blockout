package com.blockout.mobilegateway.utils;

import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.services.clients.ClubClientService;

import java.util.*;
import java.util.stream.Collectors;

public final class TeamLogoEnricher {

    private TeamLogoEnricher() {
    }

    /**
     * Enrichit les équipes avec leur logo de club via ClubClientService.getClubLogoUrl().
     */
    public static void enrichTeamsWithClubLogo(Collection<TeamDTO> teams, ClubClientService clubClientService) {
        if (teams == null || teams.isEmpty()) {
            return;
        }

        Set<String> clubIds = teams.stream()
                .map(TeamDTO::getClubId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, String> clubLogoById = new HashMap<>(clubIds.size() * 2);
        for (String clubId : clubIds) {
            String logoUrl = clubClientService.getClubLogoUrl(clubId);
            clubLogoById.put(clubId, logoUrl);
        }

        for (TeamDTO team : teams) {
            String clubId = team.getClubId();
            if (clubId != null) {
                team.setLogoUrl(clubLogoById.get(clubId));
            }
        }
    }
}