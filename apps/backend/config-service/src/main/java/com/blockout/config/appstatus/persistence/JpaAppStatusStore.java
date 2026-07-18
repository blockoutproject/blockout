package com.blockout.config.appstatus.persistence;

import com.blockout.config.appstatus.application.AppStatusChange;
import com.blockout.config.appstatus.application.AppStatusStore;
import com.blockout.config.appstatus.application.AppStatusView;
import com.blockout.config.appstatus.application.UpdateAppStatusCommand;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaAppStatusStore implements AppStatusStore {

    private final AppStatusRepository repository;
    private final AppStatusPersistenceMapper mapper;

    @Override
    public Optional<AppStatusView> find() {
        return repository.findFirstByOrderByIdAsc().map(mapper::toView);
    }

    @Override
    public Optional<AppStatusChange> update(UpdateAppStatusCommand command) {
        return repository.findFirstByOrderByIdAsc().map(entity -> update(entity, command));
    }

    private AppStatusChange update(AppStatusEntity entity, UpdateAppStatusCommand command) {
        AppStatusView before = mapper.toView(entity);
        mapper.apply(command, entity);
        AppStatusEntity saved = repository.save(entity);
        return new AppStatusChange(saved.getId(), before, mapper.toView(saved));
    }
}
