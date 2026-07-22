package com.blockout.pools.pool.api.mappers;

import com.blockout.pools.pool.api.models.CreatePoolInternalRequest;
import com.blockout.pools.pool.api.models.PoolInternalResponse;
import com.blockout.pools.pool.api.models.UpdatePoolInternalRequest;
import com.blockout.pools.pool.application.commands.CreatePoolCommand;
import com.blockout.pools.pool.application.commands.UpdatePoolCommand;
import com.blockout.pools.pool.application.views.PoolView;
import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.ReportingPolicy;

/**
 * Maps Pool transport models to application contracts and back.
 */
@Mapper(
    componentModel = "spring",
    injectionStrategy = InjectionStrategy.CONSTRUCTOR,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface PoolApiMapper {

    /**
     * Maps an internal create request to the application command.
     *
     * @param request internal Pool create request.
     * @return application create command.
     */
    CreatePoolCommand toCommand(CreatePoolInternalRequest request);

    /**
     * Maps an internal update request to the application command.
     *
     * @param request internal Pool update request.
     * @return application update command.
     */
    UpdatePoolCommand toCommand(UpdatePoolInternalRequest request);

    /**
     * Maps the authoritative application view to the internal response.
     *
     * @param view application Pool view.
     * @return generated internal response.
     */
    PoolInternalResponse toInternalResponse(PoolView view);
}
