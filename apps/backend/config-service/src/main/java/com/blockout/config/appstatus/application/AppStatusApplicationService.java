package com.blockout.config.appstatus.application;

import com.blockout.config.appstatus.application.commands.UpdateAppStatusCommand;
import com.blockout.config.appstatus.application.views.AppStatusView;
import com.blockout.config.appstatus.infrastructure.persistence.entities.AppStatusEntity;
import com.blockout.config.appstatus.infrastructure.persistence.repositories.AppStatusRepository;
import com.blockout.config.shared.application.ConfigResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/** Transactional application service for the app-status singleton. */
@Service
@RequiredArgsConstructor
public class AppStatusApplicationService implements AppStatusService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AppStatusApplicationService.class);
    private final AppStatusRepository repository;

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public AppStatusView getStatus() {
        return toView(loadStatus());
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public AppStatusView updateStatus(UpdateAppStatusCommand command) {
        AppStatusEntity status = loadStatus();
        if (command.maintenance() != null) status.setMaintenance(command.maintenance());
        if (command.message() != null) status.setMessage(command.message());
        if (command.imageUrl() != null) status.setImageUrl(command.imageUrl());
        if (command.minVersionIos() != null) status.setMinVersionIos(command.minVersionIos());
        if (command.minVersionAndroid() != null) status.setMinVersionAndroid(command.minVersionAndroid());
        if (command.storeUrlIos() != null) status.setStoreUrlIos(command.storeUrlIos());
        if (command.storeUrlAndroid() != null) status.setStoreUrlAndroid(command.storeUrlAndroid());
        if (command.forceUpdateMessage() != null) status.setForceUpdateMessage(command.forceUpdateMessage());
        AppStatusView updated = toView(repository.saveAndFlush(status));
        LOGGER.info("Updated app status", keyValue("action", "update_app_status"));
        return updated;
    }

    /** Loads the singleton or raises the stable application error. */
    private AppStatusEntity loadStatus() {
        return repository.findFirstByOrderByIdAsc().orElseThrow(() ->
                new ConfigResourceNotFoundException("app_status_not_found", "App status not found."));
    }

    /** Maps persisted state to the application view. */
    private AppStatusView toView(AppStatusEntity status) {
        return new AppStatusView(status.isMaintenance(), status.getMessage(), status.getImageUrl(),
                status.getMinVersionIos(), status.getMinVersionAndroid(), status.getStoreUrlIos(),
                status.getStoreUrlAndroid(), status.getForceUpdateMessage(), status.getLastUpdate());
    }
}
