package com.blockout.config.division.api.v2;

import com.blockout.config.division.application.CreateDivisionCommand;
import com.blockout.config.division.application.DivisionView;
import com.blockout.config.division.application.UpdateDivisionCommand;
import com.blockout.config.generated.model.CreateDivisionInternalRequest;
import com.blockout.config.generated.model.DivisionInternalResponse;
import com.blockout.config.generated.model.UpdateDivisionInternalRequest;
import com.blockout.config.shared.mapping.ConfigMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = ConfigMapperConfig.class)
public interface DivisionApiMapper {

    CreateDivisionCommand toCommand(CreateDivisionInternalRequest request);

    UpdateDivisionCommand toCommand(UpdateDivisionInternalRequest request);

    DivisionInternalResponse toResponse(DivisionView view);
}
