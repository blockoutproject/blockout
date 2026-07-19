package com.blockout.config.appstatus.api.mappers;

import com.blockout.config.appstatus.api.models.AppStatusInternalResponse;
import com.blockout.config.appstatus.api.models.UpdateAppStatusInternalRequest;
import com.blockout.config.appstatus.application.commands.UpdateAppStatusCommand;
import com.blockout.config.appstatus.application.views.AppStatusView;
import org.springframework.stereotype.Component;

/** Maps app-status HTTP models to and from the application boundary. */
@Component
public class AppStatusApiMapper {

    /** Maps an update request to its application command. */
    public UpdateAppStatusCommand toCommand(UpdateAppStatusInternalRequest request) {
        return new UpdateAppStatusCommand(
                request.maintenance(), request.message(), request.imageUrl(), request.minVersionIos(),
                request.minVersionAndroid(), request.storeUrlIos(), request.storeUrlAndroid(),
                request.forceUpdateMessage());
    }

    /** Maps the authoritative view to the V1 response. */
    public AppStatusInternalResponse toInternalResponse(AppStatusView view) {
        return new AppStatusInternalResponse(
                view.maintenance(), view.message(), view.imageUrl(), view.minVersionIos(), view.minVersionAndroid(),
                view.storeUrlIos(), view.storeUrlAndroid(), view.forceUpdateMessage(), view.lastUpdate());
    }
}
