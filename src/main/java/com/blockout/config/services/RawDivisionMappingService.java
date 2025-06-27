package com.blockout.config.services;

import com.blockout.config.exceptions.RawDivisionMappingNotFoundException;
import com.blockout.config.models.RawDivisionMapping;
import com.blockout.config.models.dto.RawDivisionMappingUpdateDTO;
import com.blockout.config.repositories.RawDivisionMappingRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class RawDivisionMappingService {

    private static final Logger logger = LoggerFactory.getLogger(RawDivisionMappingService.class);
    private final RawDivisionMappingRepository rawDivisionMappingRepository;

    /**
     * Crée un nouveau RawDivisionMapping
     *
     * @param mapping Objet à enregistrer
     * @return L'objet persisté
     */
    @Transactional
    public RawDivisionMapping create(RawDivisionMapping mapping) {
        RawDivisionMapping saved = rawDivisionMappingRepository.save(mapping);
        logger.info("RawDivisionMapping created",
                keyValue("action", "create_raw_division_mapping"),
                keyValue("id", saved.getId()));
        return saved;
    }

    /**
     * Récupère tous les RawDivisionMappings avec filtres facultatifs
     *
     * @param leagueCode code de ligue (optionnel)
     * @param season      saison (optionnel)
     * @return liste filtrée
     */
    public List<RawDivisionMapping> findByLeagueCodeAndSeason(String leagueCode, Integer season) {
        List<RawDivisionMapping> list = rawDivisionMappingRepository.findByLeagueCodeAndSeason(leagueCode, season);
        logger.debug("Listing raw division mappings",
                keyValue("action", "list_raw_division_mappings"),
                keyValue("leagueCode", leagueCode),
                keyValue("season", season),
                keyValue("resultCount", list.size()));
        return list;
    }

    /**
     * Récupère un RawDivisionMapping par ID
     *
     * @param id identifiant de la ressource
     * @return RawDivisionMapping trouvé
     * @throws RawDivisionMappingNotFoundException si absent
     */
    public RawDivisionMapping getById(Long id) {
        return rawDivisionMappingRepository.findById(id).orElseThrow(() -> {
            logger.warn("RawDivisionMapping not found",
                    keyValue("action", "get_raw_division_mapping"),
                    keyValue("id", id));
            return new RawDivisionMappingNotFoundException(id);
        });
    }

    /**
     * Met à jour un RawDivisionMapping existant
     *
     * @param id  identifiant de la ressource
     * @param dto données de mise à jour
     * @return RawDivisionMapping mis à jour
     * @throws RawDivisionMappingNotFoundException si absent
     */
    @Transactional
    public RawDivisionMapping update(Long id, RawDivisionMappingUpdateDTO dto) {
        return rawDivisionMappingRepository.findById(id).map(existing -> {
            if (dto.getDivisionCode() != null) existing.setDivisionCode(dto.getDivisionCode());
            if (dto.getFormat() != null) existing.setFormat(dto.getFormat());
            if (dto.getGender() != null) existing.setGender(dto.getGender());

            RawDivisionMapping saved = rawDivisionMappingRepository.save(existing);

            logger.info("RawDivisionMapping updated",
                    keyValue("action", "update_raw_division_mapping"),
                    keyValue("id", id));
            return saved;
        }).orElseThrow(() -> {
            logger.error("Cannot update: not found",
                    keyValue("action", "update_raw_division_mapping"),
                    keyValue("id", id));
            return new RawDivisionMappingNotFoundException(id);
        });
    }
}