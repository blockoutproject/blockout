package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolSummaryDTO;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.PoolClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PoolService {

    private final PoolClientService poolClientService;
    private final ConfigClientService configClientService;

    /**
     * Retourne une liste de poules “enrichies” par leurs IDs.
     * Champs renvoyés : id, leagueName, gender, season, division.
     */
    public List<PoolSummaryDTO> getPoolsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new InconsistentStateException("ids must be a non-empty list");
        }

        List<PoolDTO> pools = poolClientService.getPoolsByIds(Set.copyOf(ids));
        if (pools == null || pools.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Long> divisionIds = pools.stream()
                .map(PoolDTO::getDivisionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, DivisionDTO> divisionById = new HashMap<>();
        for (Long divId : divisionIds) {
            DivisionDTO div = configClientService.getDivisionById(divId);
            if (div != null) {
                divisionById.put(divId, div);
            }
        }

        return pools.stream()
                .map(p -> PoolSummaryDTO.builder()
                        .id(p.getId())
                        .leagueName(p.getLeagueName())
                        .name(p.getName())
                        .shortName(p.getShortName())
                        .season(p.getSeason())
                        .gender(p.getGender())
                        .division(divisionById.get(p.getDivisionId()))
                        .build())
                .toList();
    }
}