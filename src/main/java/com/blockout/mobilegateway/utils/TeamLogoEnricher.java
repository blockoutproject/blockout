package com.blockout.mobilegateway.utils;

import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.services.clients.ClubClientService;
import org.apache.commons.lang3.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

public final class TeamLogoEnricher {

    private TeamLogoEnricher() {
    }

    /**
     * Enrichit les équipes avec leur logo de club si elles n'en ont pas déjà un.
     */
    public static void enrichTeamsWithClubLogo(Collection<TeamDTO> teams, ClubClientService clubClientService) {
        if (teams == null || teams.isEmpty()) {
            return;
        }

        Set<String> clubIds = teams.stream()
                .filter(team -> StringUtils.isBlank(team.getLogoUrl()))
                .map(TeamDTO::getClubId)
                .collect(Collectors.toSet());

        if (clubIds.isEmpty()) {
            return;
        }

        Map<String, String> clubLogoById = new HashMap<>(clubIds.size() * 2);
        for (String clubId : clubIds) {
            String logoUrl = clubClientService.getClubLogoUrl(clubId);
            clubLogoById.put(clubId, logoUrl);
        }

        for (TeamDTO team : teams) {
            if (StringUtils.isBlank(team.getLogoUrl())) {
                String clubId = team.getClubId();
                team.setLogoUrl(clubLogoById.get(clubId));
            }
        }
    }
}