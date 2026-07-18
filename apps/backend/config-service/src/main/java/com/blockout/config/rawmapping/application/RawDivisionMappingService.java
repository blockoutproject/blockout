package com.blockout.config.rawmapping.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

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

    private final RawDivisionMappingStore store;

    @Transactional
    public RawDivisionMappingView create(CreateRawDivisionMappingCommand command) {
        RawDivisionMappingView saved = store.create(command);
        LOGGER.info("Raw division mapping created", keyValue("action", "create_raw_division_mapping"),
                keyValue("id", saved.id()));
        return saved;
    }

    @Transactional
    public RawDivisionMappingView createLegacy(LegacyRawDivisionMappingSeed seed) {
        RawDivisionMappingView saved = store.createLegacy(seed);
        LOGGER.info("Legacy raw division mapping created", keyValue("action", "create_raw_division_mapping"),
                keyValue("id", saved.id()));
        return saved;
    }

    @Transactional(readOnly = true)
    public List<RawDivisionMappingView> find(String leagueCode, String season) {
        List<RawDivisionMappingView> mappings = store.find(leagueCode, season);
        LOGGER.debug("Listing raw division mappings", keyValue("action", "list_raw_division_mappings"),
                keyValue("leagueCode", leagueCode), keyValue("season", season),
                keyValue("resultCount", mappings.size()));
        return mappings;
    }

    @Transactional(readOnly = true)
    public RawDivisionMappingView getById(Long id) {
        return store.findById(id).orElseThrow(() -> notFound(id));
    }

    @Transactional
    public RawDivisionMappingView update(Long id, UpdateRawDivisionMappingCommand command) {
        RawDivisionMappingView saved = store.update(id, command).orElseThrow(() -> notFound(id));
        LOGGER.info("Raw division mapping updated", keyValue("action", "update_raw_division_mapping"),
                keyValue("id", id));
        return saved;
    }

    private RawDivisionMappingNotFoundException notFound(Long id) {
        LOGGER.warn("Raw division mapping not found", keyValue("id", id));
        return new RawDivisionMappingNotFoundException(id);
    }
}
