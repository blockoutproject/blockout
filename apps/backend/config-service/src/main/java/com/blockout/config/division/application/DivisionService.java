package com.blockout.config.division.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.config.division.persistence.DivisionEntity;
import com.blockout.config.division.persistence.DivisionPersistenceMapper;
import com.blockout.config.division.persistence.DivisionRepository;
import com.blockout.config.exceptions.DivisionNotFoundException;
import com.blockout.config.utils.DiffUtils;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DivisionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(DivisionService.class);

    private final DivisionRepository repository;
    private final DivisionPersistenceMapper mapper;
    private final DivisionLogoStorage logoStorage;

    @Transactional(readOnly = true)
    public List<DivisionView> findAll() {
        List<DivisionView> divisions = repository.findAll().stream().map(mapper::toView).toList();
        LOGGER.debug("Listing all divisions", keyValue("action", "list_all_divisions"),
                keyValue("count", divisions.size()));
        return divisions;
    }

    @Transactional(readOnly = true)
    public DivisionView getById(Long id) {
        return mapper.toView(findEntity(id));
    }

    @Transactional
    public DivisionView create(CreateDivisionCommand command, DivisionLogoUpload image) {
        repository.findByNameIgnoreCase(command.name()).ifPresent(existing -> {
            throw new IllegalStateException("Une division avec ce nom existe déjà.");
        });

        DivisionEntity entity = mapper.toEntity(command);
        entity.setActive(true);
        if (image != null) {
            entity.setLogoUrl(logoStorage.upload(image));
        }
        DivisionEntity saved = repository.save(entity);
        LOGGER.info("New division created", keyValue("action", "create_division"),
                keyValue("divisionId", saved.getId()));
        return mapper.toView(saved);
    }

    @Transactional
    public DivisionView update(Long id, UpdateDivisionCommand command, DivisionLogoUpload image) {
        DivisionEntity entity = findEntity(id);
        DivisionEntity before = entity.toBuilder().build();
        mapper.apply(command, entity);

        if (image != null) {
            if (entity.getLogoUrl() != null) {
                logoStorage.delete(entity.getLogoUrl());
            }
            entity.setLogoUrl(logoStorage.upload(image));
        }

        if (!entity.getActive()) {
            entity.setActive(true);
            LOGGER.info("Division reactivated", keyValue("action", "reactivate_division"),
                    keyValue("divisionId", id), keyValue("divisionName", entity.getName()));
        }

        DivisionEntity saved = repository.save(entity);
        DiffUtils.logChanges(before, saved, LOGGER, "update_division", saved.getId());
        return mapper.toView(saved);
    }

    @Transactional
    public void deactivate(Long id) {
        DivisionEntity entity = findEntity(id);
        entity.setActive(false);
        repository.save(entity);
        LOGGER.info("Division deactivated", keyValue("action", "deactivate_division"),
                keyValue("divisionId", id));
    }

    private DivisionEntity findEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> {
            LOGGER.warn("Division not found", keyValue("divisionId", id));
            return new DivisionNotFoundException(id);
        });
    }
}
