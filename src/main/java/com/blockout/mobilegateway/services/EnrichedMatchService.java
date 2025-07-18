package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.competition.CompetitionAssociationDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedMatchDTO;
import com.blockout.mobilegateway.models.dto.match.MatchDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamWithStatsDTO;
import com.blockout.mobilegateway.services.clients.MatchClientService;
import com.blockout.mobilegateway.services.clients.PoolClientService;
import com.blockout.mobilegateway.services.clients.TeamClientService;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.ClubClientService;
import com.blockout.mobilegateway.services.clients.CompetitionClientService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnrichedMatchService {

    private final MatchClientService matchClientService;
    private final PoolClientService poolClientService;
    private final TeamClientService teamClientService;
    private final ConfigClientService configClientService;
    private final CompetitionClientService competitionClientService;
    private final ClubClientService clubClientService;

    public EnrichedMatchDTO getEnrichedMatchById(Long matchId) {
    MatchDTO match = matchClientService.getMatchById(matchId);
    TeamDTO teamA = teamClientService.getTeamById(match.getTeamIdA());
    TeamDTO teamB = teamClientService.getTeamById(match.getTeamIdB());

    PoolDTO rawPool = poolClientService.getPoolById(match.getPoolId());
    DivisionDTO division = configClientService.getDivisionById(rawPool.getDivisionId());

    // Associations & équipes concernées
    List<CompetitionAssociationDTO> associations = competitionClientService.getActiveAssociationsByPool(rawPool.getId());
    Set<Long> teamIds = associations.stream().map(CompetitionAssociationDTO::getTeamId).collect(Collectors.toSet());
    teamIds.add(teamA.getId());
    teamIds.add(teamB.getId());

    // Fetch de toutes les équipes concernées
    Map<Long, TeamDTO> teamsMap = teamClientService.getTeamsByIds(teamIds).stream()
            .collect(Collectors.toMap(TeamDTO::getId, Function.identity()));

    // Collecte de tous les clubIds nécessaires
    Set<String> clubIds = teamsMap.values().stream()
            .map(TeamDTO::getClubId)
            .collect(Collectors.toSet());

    System.out.println("-----------Fetching clubs for IDs: " + clubIds + " (total: " + clubIds.size() + ")");

    List<ClubDTO> clubs = clubClientService.getClubsByIds(clubIds);

    System.out.println("------------Fetched clubs: " + clubs.stream().map(ClubDTO::getId).collect(Collectors.toSet()) + " (total: " + clubs.size() + ")");

    // Fetch des clubs en une seule requête
    Map<String, String> clubLogoMap = clubs.stream()
            .collect(Collectors.toMap(
                    ClubDTO::getId,
                    club -> club.getLogoUrl() != null && !club.getLogoUrl().isBlank() ? club.getLogoUrl() : null
            ));

    System.out.println("------------Fetched clubs: " + clubLogoMap.keySet() + " (total: " + clubLogoMap.size() + ")");

    // Injection des logos dans les TeamDTO
    teamsMap.values().forEach(team -> {
        String logo = clubLogoMap.get(team.getClubId());
        team.setLogoUrl(logo);
    });

    // Enrichissement du ranking
    List<TeamWithStatsDTO> ranking = associations.stream()
            .map(assoc -> {
                TeamDTO team = teamsMap.get(assoc.getTeamId());
                if (team == null) {
                    throw new InconsistentStateException("Missing team with ID " + assoc.getTeamId() + " for pool " + rawPool.getId());
                }
                return TeamWithStatsDTO.builder()
                        .id(team.getId())
                        .name(team.getName())
                        .shortName(team.getShortName())
                        .format(team.getFormat())
                        .gender(team.getGender())
                        .followersCount(team.getFollowersCount())
                        .logoUrl(team.getLogoUrl()) // 💡 logo injecté !
                        .points(assoc.getPoints())
                        .played(assoc.getPlayed())
                        .wins(assoc.getWins())
                        .losses(assoc.getLosses())
                        .pointsPenalty(assoc.getPointsPenalty())
                        .coefSets(assoc.getCoefSets())
                        .coefPoints(assoc.getCoefPoints())
                        .build();
            })
            .sorted(Comparator
                    .comparingInt(TeamWithStatsDTO::getPoints)
                    .thenComparingInt(TeamWithStatsDTO::getPointsPenalty).reversed()
                    .thenComparingInt(TeamWithStatsDTO::getWins)
                    .thenComparingDouble(TeamWithStatsDTO::getCoefSets)
                    .thenComparingDouble(TeamWithStatsDTO::getCoefPoints))
            .toList();

    // Construction de l’objet pool enrichi
    EnrichedPoolDTO enrichedPool = EnrichedPoolDTO.builder()
            .id(rawPool.getId())
            .season(rawPool.getSeason())
            .leagueName(rawPool.getLeagueName())
            .name(rawPool.getName())
            .format(rawPool.getFormat())
            .gender(rawPool.getGender())
            .followersCount(rawPool.getFollowersCount())
            .division(division)
            .ranking(ranking)
            .build();

    // Enrichissement final : teamA et teamB (logo déjà injecté dans teamsMap)
    teamA.setLogoUrl(teamsMap.get(teamA.getId()).getLogoUrl());
    teamB.setLogoUrl(teamsMap.get(teamB.getId()).getLogoUrl());

    return EnrichedMatchDTO.builder()
            .id(match.getId())
            .matchDate(match.getMatchDate())
            .status(match.getStatus())
            .set(match.getSet())
            .score(match.getScore())
            .venue(match.getVenue())
            .firstReferee(match.getFirstReferee())
            .secondReferee(match.getSecondReferee())
            .liveCode(match.getLiveCode())
            .teamA(teamA)
            .teamB(teamB)
            .pool(enrichedPool)
            .build();
}
}