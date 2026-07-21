package com.blockout.config.appstatus.application;

import com.blockout.config.appstatus.application.commands.UpdateAppStatusCommand;
import com.blockout.config.appstatus.application.views.AppStatusView;

/**
 * Defines app-status use cases independently of HTTP and persistence models.
 */
public interface AppStatusService {

    /**
     * Returns the singleton app status.
     */
    AppStatusView getStatus();

    /**
     * Applies the supplied partial update.
     */
    AppStatusView updateStatus(UpdateAppStatusCommand command);
}
