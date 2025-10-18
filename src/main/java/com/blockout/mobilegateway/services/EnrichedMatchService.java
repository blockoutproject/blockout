package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.config.ApiClientProperties;
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
import org.springframework.web.util.UriComponentsBuilder;

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
    private final ApiClientProperties apiClientProperties;

    public EnrichedMatchDTO getEnrichedMatchById(Long matchId) {
        MatchDTO match = matchClientService.getMatchById(matchId);

        if (match == null) {
            throw new InconsistentStateException("Match not found with ID " + matchId);
        }

        TeamDTO teamA = teamClientService.getTeamById(match.getTeamIdA());

        if (teamA == null) {
            throw new InconsistentStateException("Team A not found with ID " + match.getTeamIdA());
        }

        TeamDTO teamB = teamClientService.getTeamById(match.getTeamIdB());

        if (teamB == null) {
            throw new InconsistentStateException("Team B not found with ID " + match.getTeamIdB());
        }

        PoolDTO rawPool = poolClientService.getPoolById(match.getPoolId());

        if (rawPool == null) {
            throw new InconsistentStateException("Pool not found with ID " + match.getPoolId());
        }

        DivisionDTO division = configClientService.getDivisionById(rawPool.getDivisionId());

        if (division == null) {
            throw new InconsistentStateException("Division not found for pool with ID " + match.getPoolId());
        }

        // Associations & équipes concernées
        List<CompetitionAssociationDTO> associations = competitionClientService
                .getActiveAssociationsByPool(rawPool.getId());
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

        // Fetch des clubs en une seule requête
        List<ClubDTO> clubs = clubClientService.getClubsByIds(clubIds);

        Map<String, String> clubLogoMap = new HashMap<>();
        for (ClubDTO club : clubs) {
            clubLogoMap.put(club.getId(), club.getLogoUrl());
        }

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
                        throw new InconsistentStateException(
                                "Missing team with ID " + assoc.getTeamId() + " for pool " + rawPool.getId());
                    }
                    return TeamWithStatsDTO.builder()
                            .id(team.getId())
                            .name(team.getName())
                            .shortName(team.getShortName())
                            .logoUrl(team.getLogoUrl())
                            .points(assoc.getPoints())
                            .played(assoc.getPlayed())
                            .wins(assoc.getWins())
                            .losses(assoc.getLosses())
                            .pointsPenalty(assoc.getPointsPenalty())
                            .coefSets(assoc.getCoefSets())
                            .coefPoints(assoc.getCoefPoints())
                            .build();
                })
                .sorted(
                        Comparator.comparingInt(TeamWithStatsDTO::getPoints).reversed()
                                .thenComparingInt(TeamWithStatsDTO::getPointsPenalty)
                                .thenComparing(Comparator.comparingInt(TeamWithStatsDTO::getWins).reversed())
                                .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefSets).reversed())
                                .thenComparing(Comparator.comparingDouble(TeamWithStatsDTO::getCoefPoints).reversed()))
                .toList();

        // Construction de l’objet pool enrichi
        EnrichedPoolDTO enrichedPool = EnrichedPoolDTO.builder()
                .id(rawPool.getId())
                .season(rawPool.getSeason())
                .leagueCode(rawPool.getLeagueCode())
                .leagueName(rawPool.getLeagueName())
                .name(rawPool.getName())
                .shortName(rawPool.getShortName())
                .format(rawPool.getFormat())
                .gender(rawPool.getGender())
                .followersCount(rawPool.getFollowersCount())
                .division(division)
                .ranking(ranking)
                .build();

        // Enrichissement final : teamA et teamB (logo déjà injecté dans teamsMap)
        teamA.setLogoUrl(teamsMap.get(teamA.getId()).getLogoUrl());
        teamB.setLogoUrl(teamsMap.get(teamB.getId()).getLogoUrl());

        String base = apiClientProperties.getGateway().getUrl();
        String addressUrl = UriComponentsBuilder
                .fromUriString(base)
                .path("/api/v1/mobile/ffvb/pdf")
                .queryParam("kind", "address")
                .queryParam("matchId", match.getId())
                .build(true)
                .toUriString();

        String sheetUrl = UriComponentsBuilder
                .fromUriString(base)
                .path("/api/v1/mobile/ffvb/pdf")
                .queryParam("kind", "sheet")
                .queryParam("matchId", match.getId())
                .build(true)
                .toUriString();

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
                .matchAddressPdfUrl(addressUrl)
                .matchSheetPdfUrl(sheetUrl)
                .build();
    }
}