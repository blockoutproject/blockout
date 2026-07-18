package com.blockout.config.appstatus.application;

import com.blockout.config.shared.application.ChangeLog;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AppStatusService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AppStatusService.class);

    private final AppStatusStore store;

    @Transactional(readOnly = true)
    public AppStatusView get() {
        return store.find().orElseThrow(AppStatusNotFoundException::new);
    }

    @Transactional
    public AppStatusView update(UpdateAppStatusCommand command) {
        AppStatusChange change = store.update(command).orElseThrow(AppStatusNotFoundException::new);
        ChangeLog.logChanges(change.before(), change.after(), LOGGER, "update_app_status", change.id());
        return change.after();
    }
}
