package com.blockout.config.services;

import com.blockout.config.models.RawDivisionMapping;
import com.blockout.config.repositories.RawDivisionMappingRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class RawDivisionMappingService {

    private static final Logger logger = LoggerFactory.getLogger(RawDivisionMappingService.class);
    private final RawDivisionMappingRepository repository;

    /**
     * Crée un nouveau RawDivisionMapping
     */
    @Transactional
    public RawDivisionMapping create(RawDivisionMapping mapping) {
        RawDivisionMapping saved = repository.save(mapping);
        logger.info("RawDivisionMapping created",
                keyValue("action", "create_raw_division_mapping"),
                keyValue("id", saved.getId()));
        return saved;
    }

    /**
     * Récupère tous les RawDivisionMappings avec filtres facultatifs
     */
    public List<RawDivisionMapping> findByLeagueCodeAndSeason(String leagueCode, Integer season) {
        List<RawDivisionMapping> list = repository.findByLeagueCodeAndSeason(leagueCode, season);
        logger.debug("Listing raw pool mappings",
                keyValue("action", "list_raw_division_mappings"),
                keyValue("leagueCode", leagueCode),
                keyValue("season", season),
                keyValue("resultCount", list.size()));
        return list;
    }

    /**
     * Récupère un RawDivisionMapping par ID
     */
    public Optional<RawDivisionMapping> getById(Long id) {
        Optional<RawDivisionMapping> mapping = repository.findById(id);
        if (!mapping.isPresent()) {
            logger.warn("RawDivisionMapping not found",
                    keyValue("action", "get_raw_division_mapping"),
                    keyValue("id", id));
        }
        return mapping;
    }

    /**
     * Met à jour un RawDivisionMapping existant
     */
    @Transactional
    public Optional<RawDivisionMapping> update(Long id, RawDivisionMapping updated) {
        return repository.findById(id).map(existing -> {
            existing.setDivisionName(updated.getDivisionName());
            existing.setFormat(updated.getFormat());
            existing.setGender(updated.getGender());;
            RawDivisionMapping saved = repository.save(existing);
            logger.info("RawDivisionMapping updated",
                    keyValue("action", "update_raw_division_mapping"),
                    keyValue("id", id));
            return saved;
        });
    }
}