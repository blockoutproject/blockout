package com.blockout.clubs.services;

import com.blockout.clubs.exceptions.ClubNotFoundException;
import com.blockout.clubs.models.Club;
import com.blockout.clubs.models.dto.ClubUpdateDTO;
import com.blockout.clubs.repositories.ClubRepository;
import com.blockout.clubs.services.clients.S3StorageClientService;
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
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubService {

    private static final Logger logger = LoggerFactory.getLogger(ClubService.class);

    private final ClubRepository clubRepository;
    private final EventPublisher eventPublisher;
    private final S3StorageClientService s3StorageClient;

    /**
     * Récupère les clubs en appliquant des filtres facultatifs
     *
     * @param ids liste d'IDs (null pour ignorer)
     * @return Liste des clubs correspondants
     */
    public List<Club> findClubs(List<String> ids, Boolean active) {
        List<String> safeIds = (ids == null) ? Collections.emptyList() : ids;
        List<Club> clubs = clubRepository.findFiltered(safeIds, safeIds.size(), active);

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
     * Crée un nouveau club (logo facultatif).
     *
     * @param club  Entité Club à persister (nom, ville, etc.)
     * @param image Fichier image optionnel pour le logo
     * @return Le club créé avec son ID généré et, le cas échéant, son logoUrl rempli
     */
    @Transactional
    public Club createClub(ClubUpdateDTO dto, MultipartFile image) {

        Club club = Club.builder()
                .id(dto.getId())
                .rawName(dto.getRawName())
                .name(dto.getName())
                .city(dto.getCity())
                .email(dto.getEmail())
                .phoneNumber(dto.getPhoneNumber())
                .postalCode(dto.getPostalCode())
                .website(dto.getWebsite())
                .active(true)
                .build();

        if (image != null && !image.isEmpty()) {
            ImageUtils.validateImage(image);

            try {
                String imageUrl = s3StorageClient.uploadProfileImage(image, "clubs");
                club.setLogoUrl(imageUrl);
            } catch (IOException e) {
                logger.error("Erreur lors de l'upload du logo",
                        keyValue("fileName", image.getOriginalFilename()), e);
                throw new RuntimeException("Échec de l’upload de l’image");
            }
        }

        Club saved = clubRepository.save(club);
        logger.info("New club created",
                keyValue("action", "create_club"),
                keyValue("clubId", saved.getId()));

        eventPublisher.publishClubUpsert(saved);

        return saved;
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
    public Club updateClub(ClubUpdateDTO dto, MultipartFile image) {
        String id = dto.getId();
        return clubRepository.findById(id).map(existing -> {
            Club before = existing.toBuilder().build();

            if (dto.getRawName() != null)
                existing.setRawName(dto.getRawName());
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

            if (!existing.getActive()) {
                existing.setActive(true);
                logger.info("Club réactivé",
                        keyValue("action", "reactivate_club"),
                        keyValue("clubId", id),
                        keyValue("clubName", existing.getName()));
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