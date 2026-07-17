package com.blockout.config.appstatus.api.v2;

import com.blockout.config.appstatus.application.AppStatusView;
import com.blockout.config.appstatus.application.UpdateAppStatusCommand;
import com.blockout.config.generated.model.AppStatusInternalResponse;
import com.blockout.config.generated.model.UpdateAppStatusInternalRequest;
import com.blockout.config.shared.mapping.ConfigMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = ConfigMapperConfig.class)
public interface AppStatusApiMapper {

    UpdateAppStatusCommand toCommand(UpdateAppStatusInternalRequest request);

    AppStatusInternalResponse toResponse(AppStatusView view);
}
