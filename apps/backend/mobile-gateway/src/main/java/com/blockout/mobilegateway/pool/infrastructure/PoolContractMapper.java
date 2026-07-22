package com.blockout.mobilegateway.pool.infrastructure;

import com.blockout.mobilegateway.pool.api.models.PoolInternalResponse;
import com.blockout.mobilegateway.pool.api.models.UpdatePoolRequest;
import com.blockout.mobilegateway.pool.infrastructure.contract.models.UpdatePoolInternalRequest;
import org.springframework.stereotype.Component;

/**
 * Maps generated internal Pool contracts at the gateway adapter boundary.
 */
@Component
public class PoolContractMapper {
    public PoolInternalResponse toResponse(
        com.blockout.mobilegateway.pool.infrastructure.contract.models.PoolInternalResponse pool) {
        if (pool == null) return null;
        return PoolInternalResponse.builder()
            .id(pool.getId()).poolCode(pool.getPoolCode()).leagueCode(pool.getLeagueCode()).season(pool.getSeason())
            .leagueName(pool.getLeagueName()).rawName(pool.getRawName()).name(pool.getName())
            .shortName(pool.getShortName()).divisionId(pool.getDivisionId())
            .format(com.blockout.mobilegateway.shared.application.models.Format.valueOf(pool.getFormat().name()))
            .gender(com.blockout.mobilegateway.shared.application.models.Gender.valueOf(pool.getGender().name()))
            .followersCount(pool.getFollowersCount()).active(pool.getActive())
            .createdAt(pool.getCreatedAt()).lastUpdate(pool.getLastUpdate()).build();
    }

    public UpdatePoolInternalRequest toInternalRequest(UpdatePoolRequest request) {
        return new UpdatePoolInternalRequest()
            .poolCode(request.getPoolCode()).leagueCode(request.getLeagueCode()).season(request.getSeason())
            .leagueName(request.getLeagueName()).rawName(request.getRawName()).name(request.getName())
            .shortName(request.getShortName()).divisionId(request.getDivisionId())
            .format(request.getFormat() == null ? null : com.blockout.shared.model.FormatEnum.valueOf(request.getFormat().name()))
            .gender(request.getGender() == null ? null : com.blockout.shared.model.GenderEnum.valueOf(request.getGender().name()))
            .active(request.getActive());
    }
}
