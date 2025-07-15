package com.blockout.clubs.services;

import com.blockout.clubs.exceptions.ClubNotFoundException;
import com.blockout.clubs.models.Club;
import com.blockout.clubs.models.dto.ClubUpdateDTO;
import com.blockout.clubs.repositories.ClubRepository;
import com.blockout.clubs.services.clients.S3StorageClient;
import com.blockout.clubs.utils.DiffUtils;
import com.blockout.clubs.utils.ImageUtils;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubService {

    private static final Logger logger = LoggerFactory.getLogger(ClubService.class);

    private final ClubRepository clubRepository;
    private final EventPublisher eventPublisher;
    private final S3StorageClient s3StorageClient;

    /**
     * Récupère les clubs en appliquant des filtres facultatifs
     *
     * @param ids liste d'IDs (null pour ignorer)
     * @return Liste des clubs correspondants
     */
    public List<Club> findClubs(List<String> ids) {
        List<String> safeIds = (ids == null) ? List.of() : ids;
        List<Club> clubs = clubRepository.findFiltered(safeIds, safeIds.size());

        logger.debug("Filtered clubs by IDs",
                keyValue("action", "list_clubs_by_ids"),
                keyValue("ids", safeIds),
                keyValue("count", clubs.size()));
        return clubs;
    }

    /**
     * Récupère un club par son ID
     *
     * @param id L'identifiant du club
     * @return Le club correspondant
     * @throws ClubNotFoundException si le club est introuvable
     */
    public Club getClubById(String id) {
        return clubRepository.findById(id).orElseThrow(() -> {
            logger.warn("Club not found",
                    keyValue("action", "get_club_by_id"),
                    keyValue("clubId", id));
            return new ClubNotFoundException(id);
        });
    }

    /**
     * Crée un nouveau club
     *
     * @param club L'objet Club à créer
     * @return Le club créé avec son ID généré
     */
    @Transactional
    public Club createClub(Club club) {
        Club created = clubRepository.save(club);
        logger.info("Club created successfully",
                keyValue("action", "create_club"),
                keyValue("clubId", created.getId()));
        eventPublisher.publishClubUpsert(created);
        return created;
    }

    /**
     * Met à jour un club existant
     *
     * @param id    L'identifiant du club
     * @param dto   Les nouvelles données du club
     * @param image Le logo à uploader (facultatif)
     * @return Le club mis à jour
     * @throws ClubNotFoundException si le club est introuvable
     */
    @Transactional
    public Club updateClub(String id, ClubUpdateDTO dto, MultipartFile image) {
        return clubRepository.findById(id).map(existing -> {
            Club before = existing.toBuilder().build();

            // Mise à jour conditionnelle des champs
            if (dto.getName() != null)
                existing.setName(dto.getName());
            if (dto.getCity() != null)
                existing.setCity(dto.getCity());
            if (dto.getPostalCode() != null)
                existing.setPostalCode(dto.getPostalCode());
            if (dto.getEmail() != null)
                existing.setEmail(dto.getEmail());
            if (dto.getPhoneNumber() != null)
                existing.setPhoneNumber(dto.getPhoneNumber());
            if (dto.getWebsite() != null)
                existing.setWebsite(dto.getWebsite());
            if (dto.getActive() != null)
                existing.setActive(dto.getActive());

            // Image / logo
            if (image != null && !image.isEmpty()) {
                ImageUtils.validateImage(image);
                try {
                    if (existing.getLogoUrl() != null) {
                        s3StorageClient.deleteObjectByUrl(existing.getLogoUrl());
                    }

                    String logoUrl = s3StorageClient.uploadProfileImage(image, "clubs");
                    existing.setLogoUrl(logoUrl);
                } catch (IOException e) {
                    logger.error("Erreur lors de l'upload de l'image",
                            keyValue("fileName", image.getOriginalFilename()), e);
                    throw new RuntimeException("Échec de l’upload de l’image");
                }
            }

            // Log de réactivation
            if (!before.getActive() && existing.getActive()) {
                logger.info("Club réactivé",
                        keyValue("action", "reactivate_club"),
                        keyValue("clubId", id),
                        keyValue("club_name", existing.getName()));
            }

            Club updated = clubRepository.save(existing);

            DiffUtils.logChanges(before, updated, logger, "update_club", updated.getId());

            eventPublisher.publishClubUpsert(updated);

            return updated;

        }).orElseThrow(() -> {
            logger.error("Club not found. Cannot update.",
                    keyValue("action", "update_club"),
                    keyValue("clubId", id));
            return new ClubNotFoundException(id);
        });
    }

    /**
     * Désactive un club
     *
     * @param clubId L'identifiant du club
     * @return Le club désactivé
     * @throws ClubNotFoundException si le club est introuvable
     */
    @Transactional
    public Club deactivateClub(String clubId) {
        return clubRepository.findById(clubId).map(club -> {
            club.setActive(false);
            Club updated = clubRepository.save(club);
            logger.info("Club successfully deactivated",
                    keyValue("action", "deactivate_club"),
                    keyValue("clubId", clubId));
            return updated;
        }).orElseThrow(() -> {
            logger.error("Club not found. Cannot deactivate.",
                    keyValue("action", "deactivate_club"),
                    keyValue("clubId", clubId));
            return new ClubNotFoundException(clubId);
        });
    }
}