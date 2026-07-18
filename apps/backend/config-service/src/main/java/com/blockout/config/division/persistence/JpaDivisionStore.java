package com.blockout.config.division.persistence;

import com.blockout.config.division.application.CreateDivisionCommand;
import com.blockout.config.division.application.DivisionChange;
import com.blockout.config.division.application.DivisionStore;
import com.blockout.config.division.application.DivisionUpdate;
import com.blockout.config.division.application.DivisionUpdatePlan;
import com.blockout.config.division.application.DivisionView;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaDivisionStore implements DivisionStore {

    private final DivisionRepository repository;
    private final DivisionPersistenceMapper mapper;

    @Override
    public List<DivisionView> findAll() {
        return repository.findAll().stream().map(mapper::toView).toList();
    }

    @Override
    public Optional<DivisionView> findById(Long id) {
        return repository.findById(id).map(mapper::toView);
    }

    @Override
    public boolean existsByNameIgnoreCase(String name) {
        return repository.findByNameIgnoreCase(name).isPresent();
    }

    @Override
    public DivisionView create(CreateDivisionCommand command, String logoUrl) {
        DivisionEntity entity = mapper.toEntity(command);
        entity.setActive(true);
        entity.setLogoUrl(logoUrl);
        return mapper.toView(repository.save(entity));
    }

    @Override
    public Optional<DivisionUpdate> findForUpdate(Long id) {
        return repository.findById(id).map(JpaDivisionUpdate::new);
    }

    @Override
    public boolean deactivate(Long id) {
        return repository.findById(id).map(entity -> {
            entity.setActive(false);
            repository.save(entity);
            return true;
        }).orElse(false);
    }

    private final class JpaDivisionUpdate implements DivisionUpdate {

        private final DivisionEntity entity;

        private JpaDivisionUpdate(DivisionEntity entity) {
            this.entity = entity;
        }

        @Override
        public DivisionView current() {
            return mapper.toView(entity);
        }

        @Override
        public DivisionChange apply(DivisionUpdatePlan plan) {
            DivisionView before = current();
            mapper.apply(plan.command(), entity);
            if (plan.replaceLogo()) {
                entity.setLogoUrl(plan.replacementLogoUrl());
            }
            entity.setActive(plan.active());
            DivisionView after = mapper.toView(repository.save(entity));
            return new DivisionChange(before, after);
        }
    }
}
