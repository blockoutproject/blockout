package com.blockout.config.appstatus.application;

import java.util.Optional;

public interface AppStatusStore {

    Optional<AppStatusView> find();

    Optional<AppStatusChange> update(UpdateAppStatusCommand command);
}
