package com.blockout.config.appstatus.api.mappers;

import com.blockout.config.appstatus.application.commands.UpdateAppStatusCommand;
import com.blockout.config.appstatus.application.views.AppStatusView;
import com.blockout.config.contract.model.AppStatusInternalResponse;
import com.blockout.config.contract.model.UpdateAppStatusInternalRequest;
import org.springframework.stereotype.Component;

/**
 * Maps app-status HTTP models to and from the application boundary.
 */
@Component
public class AppStatusApiMapper {

    /**
     * Maps an update request to its application command.
     */
    public UpdateAppStatusCommand toCommand(UpdateAppStatusInternalRequest request) {
        return new UpdateAppStatusCommand(
            request.getMaintenance(), request.getMessage(), request.getImageUrl(), request.getMinVersionIos(),
            request.getMinVersionAndroid(), request.getStoreUrlIos(), request.getStoreUrlAndroid(),
            request.getForceUpdateMessage());
    }

    /**
     * Maps the authoritative view to the V1 response.
     */
    public AppStatusInternalResponse toInternalResponse(AppStatusView view) {
        return new AppStatusInternalResponse(view.maintenance())
            .message(view.message())
            .imageUrl(view.imageUrl())
            .minVersionIos(view.minVersionIos())
            .minVersionAndroid(view.minVersionAndroid())
            .storeUrlIos(view.storeUrlIos())
            .storeUrlAndroid(view.storeUrlAndroid())
            .forceUpdateMessage(view.forceUpdateMessage())
            .lastUpdate(view.lastUpdate());
    }
}
