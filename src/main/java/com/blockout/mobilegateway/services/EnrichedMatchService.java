package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.match.EnrichedMatchDTO;
import com.blockout.mobilegateway.models.dto.match.MatchDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.services.clients.MatchClientService;
import com.blockout.mobilegateway.services.clients.PoolClientService;
import com.blockout.mobilegateway.services.clients.TeamClientService;
import com.blockout.mobilegateway.services.clients.ConfigClientService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EnrichedMatchService {

    private final MatchClientService matchClientService;
    private final PoolClientService poolClientService;
    private final TeamClientService teamClientService;
    private final ConfigClientService configClientService;

    public EnrichedMatchDTO getEnrichedMatchById(Long matchId) {
        MatchDTO match = matchClientService.getMatchById(matchId);
        TeamDTO teamA = teamClientService.getTeamById(match.getTeamIdA());
        TeamDTO teamB = teamClientService.getTeamById(match.getTeamIdB());
        PoolDTO rawPool = poolClientService.getPoolById(match.getPoolId());
        DivisionDTO division = configClientService.getDivisionById(rawPool.getDivisionId());
        
        EnrichedPoolDTO enrichedPool = EnrichedPoolDTO.builder()
                .id(rawPool.getId())
                .name(rawPool.getName())
                .division(division)
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