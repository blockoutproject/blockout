package com.blockout.config.rawdivisionmapping.application;

import com.blockout.config.rawdivisionmapping.application.commands.CreateRawDivisionMappingCommand;
import com.blockout.config.rawdivisionmapping.application.commands.UpdateRawDivisionMappingCommand;
import com.blockout.config.rawdivisionmapping.application.views.RawDivisionMappingView;
import com.blockout.config.rawdivisionmapping.infrastructure.persistence.entities.RawDivisionMappingEntity;
import com.blockout.config.rawdivisionmapping.infrastructure.persistence.repositories.RawDivisionMappingRepository;
import com.blockout.config.shared.application.ConfigResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/** Transactional application service for raw division mappings. */
@Service
@RequiredArgsConstructor
public class RawDivisionMappingApplicationService implements RawDivisionMappingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(RawDivisionMappingApplicationService.class);
    private final RawDivisionMappingRepository repository;

    /** {@inheritDoc} */
    @Override
    @Transactional
    public RawDivisionMappingView create(CreateRawDivisionMappingCommand command) {
        RawDivisionMappingEntity mapping = RawDivisionMappingEntity.builder()
                .rawDivisionName(command.rawDivisionName()).divisionId(command.divisionId()).format(command.format())
                .gender(command.gender()).leagueCode(command.leagueCode()).season(command.season()).build();
        RawDivisionMappingView created = toView(repository.saveAndFlush(mapping));
        LOGGER.info("Created raw division mapping", keyValue("action", "create_raw_division_mapping"),
                keyValue("mappingId", created.id()));
        return created;
    }

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public List<RawDivisionMappingView> findByLeagueCodeAndSeason(String leagueCode, String season) {
        return repository.findByLeagueCodeAndSeason(leagueCode, season).stream().map(this::toView).toList();
    }

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public RawDivisionMappingView getById(Long id) {
        return toView(loadMapping(id));
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public RawDivisionMappingView update(Long id, UpdateRawDivisionMappingCommand command) {
        RawDivisionMappingEntity mapping = loadMapping(id);
        mapping.setDivisionId(command.divisionId());
        mapping.setFormat(command.format());
        mapping.setGender(command.gender());
        RawDivisionMappingView updated = toView(repository.saveAndFlush(mapping));
        LOGGER.info("Updated raw division mapping", keyValue("action", "update_raw_division_mapping"),
                keyValue("mappingId", id));
        return updated;
    }

    /** Loads one mapping or raises the stable not-found error. */
    private RawDivisionMappingEntity loadMapping(Long id) {
        return repository.findById(id).orElseThrow(() -> new ConfigResourceNotFoundException(
                "raw_division_mapping_not_found", "Raw division mapping not found with ID: " + id));
    }

    /** Maps persisted state to the authoritative application view. */
    private RawDivisionMappingView toView(RawDivisionMappingEntity mapping) {
        return new RawDivisionMappingView(mapping.getId(), mapping.getRawDivisionName(), mapping.getDivisionId(),
                mapping.getFormat(), mapping.getGender(), mapping.getLeagueCode(), mapping.getSeason(),
                mapping.getCreatedAt(), mapping.getLastUpdate(), mapping.isMapped());
    }
}
