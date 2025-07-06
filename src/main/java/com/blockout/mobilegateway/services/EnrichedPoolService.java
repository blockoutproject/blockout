package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.PoolClientService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EnrichedPoolService {

    private final PoolClientService poolClientService;
    private final ConfigClientService configClientService;

    public EnrichedPoolDTO getEnrichedPoolById(Long poolId) {
        PoolDTO rawPool = poolClientService.getPoolById(poolId);
        DivisionDTO division = configClientService.getDivisionById(rawPool.getDivisionId());

        return EnrichedPoolDTO.builder()
                .id(rawPool.getId())
                .poolCode(rawPool.getPoolCode())
                .leagueCode(rawPool.getLeagueCode())
                .season(rawPool.getSeason())
                .leagueName(rawPool.getLeagueName())
                .name(rawPool.getName())
                .divisionId(rawPool.getDivisionId())
                .division(division)
                .format(rawPool.getFormat())
                .gender(rawPool.getGender())
                .followersCount(rawPool.getFollowersCount())
                .active(rawPool.getActive())
                .createdAt(rawPool.getCreatedAt())
                .lastUpdate(rawPool.getLastUpdate())
                .build();
    }
}