package com.blockout.clubs.services;

import com.blockout.clubs.exceptions.ClubNotFoundException;
import com.blockout.clubs.models.Club;
import com.blockout.clubs.repositories.ClubRepository;
import com.blockout.clubs.utils.DiffUtils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.List;

@Service
public class ClubService {

    private static final Logger logger = LoggerFactory.getLogger(ClubService.class);

    private final ClubRepository clubRepository;

    public ClubService(ClubRepository clubRepository) {
        this.clubRepository = clubRepository;
    }

    /**
     * Récupère tous les clubs
     * 
     * @return Liste de tous les clubs
     */
    public List<Club> getAllClubs() {
        List<Club> clubs = clubRepository.findAll();
        return clubs;
    }

    /**
     * Crée un nouveau club
     * 
     * @param club L'objet Club à créer
     * @return La club créé avec son ID généré
     */
    @Transactional
    public Club createClub(Club club) {
        Club createdClub = clubRepository.save(club);
        logger.info("Club created successfully",
                keyValue("action", "create_club"),
                keyValue("clubId", createdClub.getId()));
        return createdClub;
    }

    /**
     * Met à jour un club existant
     *
     * @param id          L'identifiant du club à mettre à jour
     * @param updatedClub Les nouvelles données du club
     * @return Le club mis à jour
     * @throws ClubNotFoundException Si le club n'existe pas
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

            Club savedClub = clubRepository.save(club);

            DiffUtils.logChanges(before, savedClub, logger,
                    "update_club", Long.valueOf(savedClub.getId()));
            return savedClub;
        }).orElseThrow(() -> {
            logger.error("Club introuvable, impossible de mettre à jour",
                    keyValue("action", "update_club"),
                    keyValue("clubId", id));
            return new ClubNotFoundException(id);
        });
    }

    /**
     * Désactive un club
     * 
     * @param clubId L'identifiant du club à désactiver
     * @return Le club désactivé
     * @throws ClubNotFoundException Si le club n'existe pas
     */
    @Transactional
    public Club deactivateClub(String clubId) {
        return clubRepository.findById(clubId).map(club -> {
            club.setActive(false);
            Club updatedClub = clubRepository.save(club);

            logger.info("Club successfully deactivated",
                    keyValue("action", "deactivate_club"),
                    keyValue("clubId", clubId));

            return updatedClub;
        }).orElseThrow(() -> {
            logger.error("Club not found. Cannot deactivate.",
                    keyValue("action", "deactivate_club"),
                    keyValue("clubId", clubId));
            return new ClubNotFoundException(clubId);
        });
    }
}