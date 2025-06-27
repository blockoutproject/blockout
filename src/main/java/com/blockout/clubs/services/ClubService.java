package com.blockout.clubs.services;

import com.blockout.clubs.exceptions.ClubNotFoundException;
import com.blockout.clubs.models.Club;
import com.blockout.clubs.repositories.ClubRepository;
import com.blockout.clubs.utils.DiffUtils;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubService {

    private static final Logger logger = LoggerFactory.getLogger(ClubService.class);

    private final ClubRepository clubRepository;
    private final EventPublisher eventPublisher;

    /**
     * Récupère tous les clubs
     *
     * @return Liste de tous les clubs
     */
    public List<Club> getAllClubs() {
        List<Club> clubs = clubRepository.findAll();
        logger.debug("All clubs fetched",
                keyValue("action", "list_clubs"),
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
     * @param id          L'identifiant du club
     * @param updatedClub Les nouvelles données
     * @return Le club mis à jour
     * @throws ClubNotFoundException si le club est introuvable
     */
    @Transactional
    public Club updateClub(String id, Club updatedClub) {
        return clubRepository.findById(id).map(club -> {
            Club before = club.toBuilder().build();

            club.setName(updatedClub.getName());
            club.setCity(updatedClub.getCity());
            club.setPostalCode(updatedClub.getPostalCode());
            club.setEmail(updatedClub.getEmail());
            club.setPhoneNumber(updatedClub.getPhoneNumber());
            club.setWebsite(updatedClub.getWebsite());
            club.setActive(updatedClub.getActive());

            if (!before.getActive() && club.getActive()) {
                logger.info("Club réactivé",
                        keyValue("action", "reactivate_club"),
                        keyValue("clubId", id),
                        keyValue("club_name", updatedClub.getName()));
            }

            Club saved = clubRepository.save(club);

            DiffUtils.logChanges(before, saved, logger,
                    "update_club", saved.getId());

            eventPublisher.publishClubUpsert(saved);

            return saved;
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