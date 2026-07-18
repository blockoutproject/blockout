package com.blockout.config.division.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.config.division.domain.DivisionLogoUpload;
import com.blockout.config.shared.application.ChangeLog;
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

    private final DivisionStore store;
    private final DivisionLogoStorage logoStorage;

    @Transactional(readOnly = true)
    public List<DivisionView> findAll() {
        List<DivisionView> divisions = store.findAll();
        LOGGER.debug("Listing all divisions", keyValue("action", "list_all_divisions"),
                keyValue("count", divisions.size()));
        return divisions;
    }

    @Transactional(readOnly = true)
    public DivisionView getById(Long id) {
        return find(id);
    }

    @Transactional
    public DivisionView create(CreateDivisionCommand command, DivisionLogoUpload image) {
        if (store.existsByNameIgnoreCase(command.name())) {
            throw new IllegalStateException("Une division avec ce nom existe déjà.");
        }

        String logoUrl = image == null ? null : logoStorage.upload(image);
        DivisionView saved = store.create(command, logoUrl);
        LOGGER.info("New division created", keyValue("action", "create_division"),
                keyValue("divisionId", saved.id()));
        return saved;
    }

    @Transactional
    public DivisionView update(Long id, UpdateDivisionCommand command, DivisionLogoUpload image) {
        DivisionUpdate update = store.findForUpdate(id).orElseThrow(() -> notFound(id));
        DivisionView current = update.current();
        String replacementLogoUrl = null;
        boolean replaceLogo = image != null;

        if (replaceLogo) {
            if (current.logoUrl() != null) {
                logoStorage.delete(current.logoUrl());
            }
            replacementLogoUrl = logoStorage.upload(image);
        }

        if (Boolean.FALSE.equals(current.active())) {
            LOGGER.info("Division reactivated", keyValue("action", "reactivate_division"),
                    keyValue("divisionId", id), keyValue("divisionName", current.name()));
        }

        DivisionUpdatePlan plan = new DivisionUpdatePlan(command, replacementLogoUrl, replaceLogo, true);
        DivisionChange change = update.apply(plan);
        ChangeLog.logChanges(change.before(), change.after(), LOGGER, "update_division", change.after().id());
        return change.after();
    }

    @Transactional
    public void deactivate(Long id) {
        if (!store.deactivate(id)) {
            throw notFound(id);
        }
        LOGGER.info("Division deactivated", keyValue("action", "deactivate_division"),
                keyValue("divisionId", id));
    }

    private DivisionView find(Long id) {
        return store.findById(id).orElseThrow(() -> notFound(id));
    }

    private DivisionNotFoundException notFound(Long id) {
        LOGGER.warn("Division not found", keyValue("divisionId", id));
        return new DivisionNotFoundException(id);
    }
}
