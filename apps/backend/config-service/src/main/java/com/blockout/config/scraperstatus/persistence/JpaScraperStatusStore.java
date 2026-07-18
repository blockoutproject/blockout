package com.blockout.config.scraperstatus.persistence;

import com.blockout.config.scraperstatus.application.ScraperStatusChange;
import com.blockout.config.scraperstatus.application.ScraperStatusStore;
import com.blockout.config.scraperstatus.application.ScraperStatusView;
import com.blockout.shared.model.ScraperNameEnum;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaScraperStatusStore implements ScraperStatusStore {

    private final ScraperStatusRepository repository;
    private final ScraperStatusPersistenceMapper mapper;

    @Override
    public Optional<ScraperStatusView> findByName(ScraperNameEnum name) {
        return repository.findByName(name).map(mapper::toView);
    }

    @Override
    public ScraperStatusChange upsert(ScraperNameEnum name, boolean enabled) {
        ScraperStatusEntity entity = repository.findByName(name)
                .orElseGet(() -> ScraperStatusEntity.builder().name(name).enabled(false).build());
        boolean previousEnabled = entity.isEnabled();
        entity.setEnabled(enabled);
        return new ScraperStatusChange(previousEnabled, mapper.toView(repository.save(entity)));
    }

    @Override
    public List<ScraperStatusView> findAll() {
        return repository.findAll().stream().map(mapper::toView).toList();
    }
}
