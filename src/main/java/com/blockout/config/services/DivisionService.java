package com.blockout.config.services;

import com.blockout.config.exceptions.DivisionNotFoundException;
import com.blockout.config.models.Division;
import com.blockout.config.models.dto.DivisionDTO;
import com.blockout.config.repositories.DivisionRepository;
import com.blockout.config.services.clients.S3StorageClient;
import com.blockout.config.utils.DiffUtils;
import com.blockout.config.utils.ImageUtils;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class DivisionService {

    private static final Logger logger = LoggerFactory.getLogger(DivisionService.class);
    private final DivisionRepository divisionRepository;
    private final S3StorageClient s3StorageClient;

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
    public Division getDivisionById(Long id) {
        return divisionRepository.findById(id).orElseThrow(() -> {
            logger.warn("Division non trouvée", keyValue("divisionId", id));
            return new DivisionNotFoundException(id);
        });
    }

    /**
     * Crée une nouvelle division
     */
    @Transactional
    public Division createDivision(DivisionDTO dto, MultipartFile image) {
        divisionRepository.findByNameIgnoreCase(dto.getName())
                .ifPresent(existing -> {
                    throw new IllegalStateException("Une division avec ce nom existe déjà.");
                });

        Division division = Division.builder()
                .name(dto.getName())
                .mainColor(dto.getMainColor())
                .firstGradientColor(dto.getFirstGradientColor())
                .secondGradientColor(dto.getSecondGradientColor())
                .thirdGradientColor(dto.getThirdGradientColor())
                .active(true)
                .build();

        if (image != null && !image.isEmpty()) {
            ImageUtils.validateImage(image);
            try {
                String imageUrl = s3StorageClient.uploadProfileImage(image, "divisions");
                division.setLogoUrl(imageUrl);
            } catch (IOException e) {
                logger.error("Erreur lors de l'upload de l'image",
                        keyValue("fileName", image.getOriginalFilename()), e);
                throw new RuntimeException("Échec de l’upload de l’image");
            }
        }

        Division created = divisionRepository.save(division);
        logger.info("New division created",
                keyValue("action", "create_division"),
                keyValue("divisionId", created.getId()));
        return created;
    }

    /**
     * Met à jour une division existante
     *
     * @param id    L'identifiant de la division
     * @param dto   Les données à mettre à jour
     * @param image L'image à uploader (facultative)
     * @return La division mise à jour
     * @throws DivisionNotFoundException si la division n'existe pas
     */
    @Transactional
    public Division updateDivision(Long id, DivisionDTO dto, MultipartFile image) {
        return divisionRepository.findById(id).map(existing -> {
            Division before = existing.toBuilder().build();

            // Champs de base
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

            if (image != null && !image.isEmpty()) {
                ImageUtils.validateImage(image);
                try {
                    if (existing.getLogoUrl() != null) {
                        s3StorageClient.deleteObjectByUrl(existing.getLogoUrl());
                    }

                    String imageUrl = s3StorageClient.uploadProfileImage(image, "divisions");
                    existing.setLogoUrl(imageUrl);
                } catch (IOException e) {
                    logger.error("Erreur lors de l'upload de l'image",
                            keyValue("fileName", image.getOriginalFilename()), e);
                    throw new RuntimeException("Échec de l’upload de l’image");
                }
            }

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