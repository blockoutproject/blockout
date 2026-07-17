package com.blockout.config.appstatus.application;

import com.blockout.config.appstatus.persistence.AppStatusEntity;
import com.blockout.config.appstatus.persistence.AppStatusPersistenceMapper;
import com.blockout.config.appstatus.persistence.AppStatusRepository;
import com.blockout.config.exceptions.AppStatusNotFoundException;
import com.blockout.config.utils.DiffUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AppStatusService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AppStatusService.class);

    private final AppStatusRepository repository;
    private final AppStatusPersistenceMapper mapper;

    @Transactional(readOnly = true)
    public AppStatusView get() {
        return repository.findFirstByOrderByIdAsc()
                .map(mapper::toView)
                .orElseThrow(AppStatusNotFoundException::new);
    }

    @Transactional
    public AppStatusView update(UpdateAppStatusCommand command) {
        AppStatusEntity entity = repository.findFirstByOrderByIdAsc()
                .orElseThrow(AppStatusNotFoundException::new);
        AppStatusEntity before = entity.toBuilder().build();
        mapper.apply(command, entity);
        AppStatusEntity saved = repository.save(entity);
        DiffUtils.logChanges(before, saved, LOGGER, "update_app_status", saved.getId());
        return mapper.toView(saved);
    }
}
