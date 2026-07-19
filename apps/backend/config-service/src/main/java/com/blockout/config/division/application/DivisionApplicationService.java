package com.blockout.config.division.application;

import com.blockout.config.division.application.commands.CreateDivisionCommand;
import com.blockout.config.division.application.commands.DivisionImageCommand;
import com.blockout.config.division.application.commands.UpdateDivisionCommand;
import com.blockout.config.division.application.ports.DivisionImageStorage;
import com.blockout.config.division.application.views.DivisionView;
import com.blockout.config.division.infrastructure.persistence.entities.DivisionEntity;
import com.blockout.config.division.infrastructure.persistence.repositories.DivisionRepository;
import com.blockout.config.shared.application.ConfigResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/** Transactional application service for divisions. */
@Service
@RequiredArgsConstructor
public class DivisionApplicationService implements DivisionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(DivisionApplicationService.class);
    private static final long MAX_IMAGE_SIZE = 5L * 1024L * 1024L;
    private final DivisionRepository repository;
    private final DivisionImageStorage imageStorage;

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public List<DivisionView> findAll() {
        return repository.findAll().stream().map(this::toView).toList();
    }

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public DivisionView getById(Long id) {
        return toView(loadDivision(id));
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public DivisionView create(CreateDivisionCommand command) {
        repository.findByNameIgnoreCase(command.name()).ifPresent(existing -> {
            throw new IllegalStateException("A division with this name already exists.");
        });
        DivisionEntity division = DivisionEntity.builder()
                .name(command.name()).mainColor(command.mainColor())
                .firstGradientColor(command.firstGradientColor())
                .secondGradientColor(command.secondGradientColor())
                .thirdGradientColor(command.thirdGradientColor()).active(true).build();
        if (hasImage(command.image())) {
            validateImage(command.image());
            division.setLogoUrl(imageStorage.uploadDivisionImage(command.image()));
        }
        DivisionView created = toView(repository.saveAndFlush(division));
        LOGGER.info("Created division", keyValue("action", "create_division"), keyValue("divisionId", created.id()));
        return created;
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public DivisionView update(Long id, UpdateDivisionCommand command) {
        DivisionEntity division = loadDivision(id);
        if (command.name() != null) division.setName(command.name());
        if (command.mainColor() != null) division.setMainColor(command.mainColor());
        if (command.firstGradientColor() != null) division.setFirstGradientColor(command.firstGradientColor());
        if (command.secondGradientColor() != null) division.setSecondGradientColor(command.secondGradientColor());
        if (command.thirdGradientColor() != null) division.setThirdGradientColor(command.thirdGradientColor());
        if (hasImage(command.image())) {
            validateImage(command.image());
            if (division.getLogoUrl() != null) imageStorage.deleteDivisionImage(division.getLogoUrl());
            division.setLogoUrl(imageStorage.uploadDivisionImage(command.image()));
        }
        division.setActive(true);
        DivisionView updated = toView(repository.saveAndFlush(division));
        LOGGER.info("Updated division", keyValue("action", "update_division"), keyValue("divisionId", id));
        return updated;
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public void deactivate(Long id) {
        DivisionEntity division = loadDivision(id);
        division.setActive(false);
        repository.saveAndFlush(division);
        LOGGER.info("Deactivated division", keyValue("action", "deactivate_division"), keyValue("divisionId", id));
    }

    /** Loads one division or raises a stable application error. */
    private DivisionEntity loadDivision(Long id) {
        return repository.findById(id).orElseThrow(() ->
                new ConfigResourceNotFoundException("division_not_found", "Division not found with ID: " + id));
    }

    /** Checks whether an upload contains bytes. */
    private boolean hasImage(DivisionImageCommand image) {
        return image != null && !image.isEmpty();
    }

    /** Enforces the existing PNG/JPEG and five-megabyte constraints. */
    private void validateImage(DivisionImageCommand image) {
        if (!"image/png".equals(image.contentType()) && !"image/jpeg".equals(image.contentType())) {
            throw new IllegalArgumentException("Only PNG and JPEG images are allowed.");
        }
        if (image.content().length > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("The maximum image size is 5 MB.");
        }
    }

    /** Maps persisted state to the authoritative application view. */
    private DivisionView toView(DivisionEntity division) {
        return new DivisionView(division.getId(), division.getName(), division.getMainColor(),
                division.getFirstGradientColor(), division.getSecondGradientColor(), division.getThirdGradientColor(),
                division.getLogoUrl(), division.getActive(), division.getCreatedAt(), division.getLastUpdate());
    }
}
