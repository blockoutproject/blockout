package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamSummaryDTO;
import com.blockout.mobilegateway.services.clients.ClubClientService;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.TeamClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamClientService teamClientService;
    private final ConfigClientService configClientService;
    private final ClubClientService clubClientService;

    /**
     * Retourne une liste d’équipes “light” pour un club donné.
     * Champs renvoyés: id, name, shortName, format, gender, season, division, club (pour le logo).
     */
    public List<TeamSummaryDTO> getTeamsByClubId(String clubId) {
        if (clubId == null || clubId.isBlank()) {
            throw new InconsistentStateException("clubId must be a non-empty string");
        }

        // 1) Récupérer les équipes du club (Team API)
        List<TeamDTO> teams = teamClientService.getTeamsByClubId(clubId);
        if (teams == null || teams.isEmpty()) {
            return Collections.emptyList();
        }

        // 2) Préparer les divisions (éviter les appels en doublon)
        Set<Long> divisionIds = teams.stream()
                .map(TeamDTO::getDivisionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, DivisionDTO> divisionById = new HashMap<>();
        for (Long divId : divisionIds) {
            DivisionDTO div = configClientService.getDivisionById(divId);
            if (div != null) {
                divisionById.put(divId, div);
            }
        }

        // 3) Récupérer le club pour le logo (Club API)
        // On utilise la méthode batch existante pour rester cohérent avec tes clients
        Map<String, ClubDTO> clubById = clubClientService.getClubsByIds(Set.of(clubId))
                .stream()
                .collect(Collectors.toMap(ClubDTO::getId, c -> c));

        ClubDTO club = clubById.get(clubId);
        // club peut être null si l'API Club ne trouve rien, on renverra alors club=null

        // 4) Map -> TeamSummaryDTO
        return teams.stream()
                .map(t -> TeamSummaryDTO.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .shortName(t.getShortName())
                        .format(t.getFormat())
                        .gender(t.getGender())
                        .season(t.getSeason())
                        .division(divisionById.get(t.getDivisionId()))
                        .club(club) // contient le logoUrl attendu
                        .build())
                .toList();
    }
}