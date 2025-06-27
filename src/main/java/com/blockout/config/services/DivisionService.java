package com.blockout.config.services;

import com.blockout.config.exceptions.DivisionNotFoundException;
import com.blockout.config.models.Division;
import com.blockout.config.models.dto.DivisionUpdateDTO;
import com.blockout.config.repositories.DivisionRepository;
import com.blockout.config.utils.DiffUtils;
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
public class DivisionService {

    private static final Logger logger = LoggerFactory.getLogger(DivisionService.class);
    private final DivisionRepository divisionRepository;

    /**
     * Récupère toutes les divisions, actives ou non
     */
    public List<Division> findAll() {
        List<Division> list = divisionRepository.findAll();
        logger.debug("Listing all divisions",
                keyValue("action", "list_all_divisions"),
                keyValue("count", list.size()));
        return list;
    }

    /**
     * Récupère une division par ID
     */
    public Optional<Division> getById(Long id) {
        Optional<Division> division = divisionRepository.findById(id);
        if (division.isEmpty()) {
            logger.warn("Division not found",
                    keyValue("action", "get_division_by_id"),
                    keyValue("divisionId", id));
        }
        return division;
    }

    /**
     * Crée une nouvelle division
     */
    @Transactional
    public Division createDivision(Division incoming) {
        Optional<Division> existing = divisionRepository.findByNameIgnoreCase(incoming.getName());

        if (existing.isPresent()) {
            throw new IllegalStateException("Une division avec ce nom existe déjà.");
        }

        Division created = divisionRepository.save(incoming);
        logger.info("New division created",
                keyValue("action", "create_division"),
                keyValue("divisionId", created.getId()));
        return created;
    }

    /**
     * Met à jour une division existante
     *
     * @param id  L'identifiant de la division
     * @param dto Les données à mettre à jour
     * @return La division mise à jour
     * @throws DivisionNotFoundException si la division n'existe pas
     */
    @Transactional
    public Division updateDivision(Long id, DivisionUpdateDTO dto) {
        return divisionRepository.findById(id).map(existing -> {
            Division before = existing.toBuilder().build();

            if (dto.getName() != null)
                existing.setName(dto.getName());
            if (dto.getMainColor() != null)
                existing.setMainColor(dto.getMainColor());
            if (dto.getFirstGradientColor() != null)
                existing.setFirstGradientColor(dto.getFirstGradientColor());
            if (dto.getSecondGradientColor() != null)
                existing.setSecondGradientColor(dto.getSecondGradientColor());
            if (dto.getThirdGradientColor() != null)
                existing.setThirdGradientColor(dto.getThirdGradientColor());
            if (dto.getDivisionImageUrl() != null)
                existing.setProfileImageUrl(dto.getDivisionImageUrl());

            if (!existing.getActive()) {
                existing.setActive(true);
            }

            Division updated = divisionRepository.save(existing);
            DiffUtils.logChanges(before, updated, logger, "update_division", updated.getId());
            return updated;

        }).orElseThrow(() -> {
            logger.error("Division not found. Cannot update.",
                    keyValue("action", "update_division"),
                    keyValue("divisionId", id));
            return new DivisionNotFoundException(id);
        });
    }

    /**
     * Désactive une division sans la supprimer
     *
     * @param id L'ID de la division à désactiver
     * @return La division désactivée
     * @throws DivisionNotFoundException si l'ID n'existe pas
     */
    @Transactional
    public Division deactivateDivision(Long id) {
        return divisionRepository.findById(id).map(existing -> {
            existing.setActive(false);
            Division updated = divisionRepository.save(existing);

            logger.info("Division deactivated",
                    keyValue("action", "deactivate_division"),
                    keyValue("divisionId", id));
            return updated;

        }).orElseThrow(() -> {
            logger.error("Division not found. Cannot deactivate.",
                    keyValue("action", "deactivate_division"),
                    keyValue("divisionId", id));
            return new DivisionNotFoundException(id);
        });
    }
}