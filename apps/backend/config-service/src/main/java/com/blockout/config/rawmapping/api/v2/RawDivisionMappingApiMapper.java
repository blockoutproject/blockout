package com.blockout.config.rawmapping.api.v2;

import com.blockout.config.generated.model.CreateRawDivisionMappingInternalRequest;
import com.blockout.config.generated.model.RawDivisionMappingInternalResponse;
import com.blockout.config.generated.model.UpdateRawDivisionMappingInternalRequest;
import com.blockout.config.rawmapping.application.CreateRawDivisionMappingCommand;
import com.blockout.config.rawmapping.application.RawDivisionMappingView;
import com.blockout.config.rawmapping.application.UpdateRawDivisionMappingCommand;
import com.blockout.config.shared.mapping.ConfigMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = ConfigMapperConfig.class)
public interface RawDivisionMappingApiMapper {

    CreateRawDivisionMappingCommand toCommand(CreateRawDivisionMappingInternalRequest request);

    UpdateRawDivisionMappingCommand toCommand(UpdateRawDivisionMappingInternalRequest request);

    RawDivisionMappingInternalResponse toResponse(RawDivisionMappingView view);
}
