package com.blockout.config.rawdivisionmapping.api.mappers;

import com.blockout.config.contract.model.CreateRawDivisionMappingInternalRequest;
import com.blockout.config.contract.model.RawDivisionMappingInternalResponse;
import com.blockout.config.contract.model.UpdateRawDivisionMappingInternalRequest;
import com.blockout.config.rawdivisionmapping.application.commands.CreateRawDivisionMappingCommand;
import com.blockout.config.rawdivisionmapping.application.commands.UpdateRawDivisionMappingCommand;
import com.blockout.config.rawdivisionmapping.application.views.RawDivisionMappingView;
import com.blockout.config.shared.api.mappers.ConfigMapperConfig;
import org.mapstruct.Mapper;

/**
 * Maps raw-division transport models to application contracts and back.
 */
@Mapper(config = ConfigMapperConfig.class)
public interface RawDivisionMappingApiMapper {

    /**
     * Maps an internal create request to the application command.
     *
     * @param request internal raw-division create request.
     * @return application create command.
     */
    CreateRawDivisionMappingCommand toCommand(CreateRawDivisionMappingInternalRequest request);

    /**
     * Maps an internal update request to the application command.
     *
     * @param request internal raw-division update request.
     * @return application update command.
     */
    UpdateRawDivisionMappingCommand toCommand(UpdateRawDivisionMappingInternalRequest request);

    /**
     * Maps the authoritative application view to the internal response.
     *
     * @param view application raw-division view.
     * @return generated internal response.
     */
    RawDivisionMappingInternalResponse toInternalResponse(RawDivisionMappingView view);
}
