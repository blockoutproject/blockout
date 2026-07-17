package com.blockout.config.rawmapping.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.config.exceptions.RawDivisionMappingNotFoundException;
import com.blockout.config.rawmapping.persistence.RawDivisionMappingEntity;
import com.blockout.config.rawmapping.persistence.RawDivisionMappingPersistenceMapper;
import com.blockout.config.rawmapping.persistence.RawDivisionMappingRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RawDivisionMappingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(RawDivisionMappingService.class);

    private final RawDivisionMappingRepository repository;
    private final RawDivisionMappingPersistenceMapper mapper;

    @Transactional
    public RawDivisionMappingView create(CreateRawDivisionMappingCommand command) {
        RawDivisionMappingEntity saved = repository.save(mapper.toEntity(command));
        LOGGER.info("Raw division mapping created", keyValue("action", "create_raw_division_mapping"),
                keyValue("id", saved.getId()));
        return mapper.toView(saved);
    }

    @Transactional
    public RawDivisionMappingView createLegacy(LegacyRawDivisionMappingSeed seed) {
        RawDivisionMappingEntity saved = repository.save(mapper.toEntity(seed));
        LOGGER.info("Legacy raw division mapping created", keyValue("action", "create_raw_division_mapping"),
                keyValue("id", saved.getId()));
        return mapper.toView(saved);
    }

    @Transactional(readOnly = true)
    public List<RawDivisionMappingView> find(String leagueCode, String season) {
        List<RawDivisionMappingView> mappings = repository.findByLeagueCodeAndSeason(leagueCode, season).stream()
                .map(mapper::toView)
                .toList();
        LOGGER.debug("Listing raw division mappings", keyValue("action", "list_raw_division_mappings"),
                keyValue("leagueCode", leagueCode), keyValue("season", season),
                keyValue("resultCount", mappings.size()));
        return mappings;
    }

    @Transactional(readOnly = true)
    public RawDivisionMappingView getById(Long id) {
        return mapper.toView(findEntity(id));
    }

    @Transactional
    public RawDivisionMappingView update(Long id, UpdateRawDivisionMappingCommand command) {
        RawDivisionMappingEntity entity = findEntity(id);
        mapper.apply(command, entity);
        RawDivisionMappingEntity saved = repository.save(entity);
        LOGGER.info("Raw division mapping updated", keyValue("action", "update_raw_division_mapping"),
                keyValue("id", id));
        return mapper.toView(saved);
    }

    private RawDivisionMappingEntity findEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> {
            LOGGER.warn("Raw division mapping not found", keyValue("id", id));
            return new RawDivisionMappingNotFoundException(id);
        });
    }
}
