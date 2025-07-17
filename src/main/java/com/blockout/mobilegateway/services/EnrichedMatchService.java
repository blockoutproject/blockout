package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.exceptions.InconsistentStateException;
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
        String teamALogoUrl = clubClientService.getClubLogoUrl(teamA.getClubId());
        String teamBLogoUrl = clubClientService.getClubLogoUrl(teamB.getClubId());
        PoolDTO rawPool = poolClientService.getPoolById(match.getPoolId());
        DivisionDTO division = configClientService.getDivisionById(rawPool.getDivisionId());

        // Enrich teams with logos
        teamA.setLogoUrl(teamALogoUrl);
        teamB.setLogoUrl(teamBLogoUrl);

        // Classement : associations + teams
        List<CompetitionAssociationDTO> associations = competitionClientService.getActiveAssociationsByPool(rawPool.getId());
        Set<Long> teamIds = associations.stream().map(CompetitionAssociationDTO::getTeamId).collect(Collectors.toSet());
        Map<Long, TeamDTO> teamsMap = teamClientService.getTeamsByIds(teamIds).stream()
                .collect(Collectors.toMap(TeamDTO::getId, Function.identity()));

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