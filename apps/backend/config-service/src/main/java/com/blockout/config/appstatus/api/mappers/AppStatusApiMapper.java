package com.blockout.config.appstatus.api.mappers;

import com.blockout.config.appstatus.application.commands.UpdateAppStatusCommand;
import com.blockout.config.appstatus.application.views.AppStatusView;
import com.blockout.config.contract.model.AppStatusInternalResponse;
import com.blockout.config.contract.model.UpdateAppStatusInternalRequest;
import com.blockout.config.shared.api.mappers.ConfigMapperConfig;
import org.mapstruct.Mapper;

/**
 * Maps app-status transport models to application contracts and back.
 */
@Mapper(config = ConfigMapperConfig.class)
public interface AppStatusApiMapper {

    /**
     * Maps an internal update request to the application command.
     *
     * @param request internal app-status request.
     * @return application update command.
     */
    UpdateAppStatusCommand toCommand(UpdateAppStatusInternalRequest request);

    /**
     * Maps the authoritative application view to the internal response.
     *
     * @param view application app-status view.
     * @return generated internal response.
     */
    AppStatusInternalResponse toInternalResponse(AppStatusView view);
}
