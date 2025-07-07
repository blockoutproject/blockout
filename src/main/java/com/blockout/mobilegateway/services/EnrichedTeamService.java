package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.team.EnrichedTeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.competition.CompetitionAssociationDTO;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.TeamClientService;
import com.blockout.mobilegateway.services.clients.CompetitionClientService;
import com.blockout.mobilegateway.services.clients.PoolClientService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnrichedTeamService {

    private final TeamClientService teamClientService;
    private final ConfigClientService configClientService;
    private final CompetitionClientService competitionClientService;
    private final PoolClientService poolClientService;

    public EnrichedTeamDTO getEnrichedTeamById(Long teamId) {
        TeamDTO team = teamClientService.getTeamById(teamId);
        DivisionDTO division = configClientService.getDivisionById(team.getDivisionId());

        List<CompetitionAssociationDTO> poolAssocs = competitionClientService.getPoolsAssocByTeam(teamId);
        Set<Long> poolIds = poolAssocs.stream().map(CompetitionAssociationDTO::getPoolId).collect(Collectors.toSet());
        List<PoolDTO> pools = poolClientService.getPoolsByIds(poolIds);

        return EnrichedTeamDTO.builder()
                .id(team.getId())
                .clubId(team.getClubId())
                .name(team.getName())
                .shortName(team.getShortName())
                .leagueCode(team.getLeagueCode())
                .format(team.getFormat())
                .gender(team.getGender())
                .followersCount(team.getFollowersCount())
                .division(division)
                .pools(pools)
                .build();
    }
}