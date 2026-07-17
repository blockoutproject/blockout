package com.blockout.pools.pool.api.v2;

import com.blockout.pools.generated.model.CreatePoolInternalRequest;
import com.blockout.pools.generated.model.PoolInternalResponse;
import com.blockout.pools.generated.model.UpdatePoolInternalRequest;
import com.blockout.pools.pool.application.CreatePoolCommand;
import com.blockout.pools.pool.application.PoolView;
import com.blockout.pools.pool.application.UpdatePoolCommand;
import com.blockout.pools.shared.mapping.PoolsMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = PoolsMapperConfig.class)
public interface PoolApiMapper {

    CreatePoolCommand toCommand(CreatePoolInternalRequest request);

    UpdatePoolCommand toCommand(UpdatePoolInternalRequest request);

    PoolInternalResponse toResponse(PoolView view);
}
