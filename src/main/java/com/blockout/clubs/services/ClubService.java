package com.blockout.clubs.services;

import com.blockout.clubs.exceptions.ClubNotFoundException;
import com.blockout.clubs.models.Club;
import com.blockout.clubs.repositories.ClubRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ClubService {

    private static final Logger logger = LoggerFactory.getLogger(ClubService.class);

    private final ClubRepository clubRepository;
    private final EventPublisher eventPublisher;

    public ClubService(ClubRepository clubRepository, EventPublisher eventPublisher) {
        this.clubRepository = clubRepository;
        this.eventPublisher = eventPublisher;
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
     * Met à jour une club existante
     * 
     * @param id          L'identifiant du club à mettre à jour
     * @param updatedClub Les nouvelles données du club
     * @return Le club mis à jour
     * @throws ClubNotFoundException Si le club n'existe pas
     */
    @Transactional
    public Club updateClub(Long id, Club updatedClub) {
        return clubRepository.findById(id).map(club -> {
            club.setName(updatedClub.getName());
            club.setCity(updatedClub.getCity());
            club.setPostalCode(updatedClub.getPostalCode());
            club.setEmail(updatedClub.getEmail());
            club.setPhoneNumber(updatedClub.getPhoneNumber());
            club.setWebsite(updatedClub.getWebsite());
            club.setActive(updatedClub.getActive());
            Club savedClub = clubRepository.save(club);

            logger.info("Club updated successfully",
                    keyValue("action", "update_club"),
                    keyValue("clubId", savedClub.getId()));
            return savedClub;
        }).orElseThrow(() -> {
            logger.error("Club not found, cannot update",
                    keyValue("action", "update_club"),
                    keyValue("clubId", id));
            return new ClubNotFoundException(id);
        });
    }

    /**
     * Désactive les clubs dont les IDs ne figurent pas dans la liste
     *
     * @param activeClubIds Liste des clubs considérés comme encore actifs
     */
    @Transactional
    public void bulkDeactivateClubs(List<Long> activeClubIds) {
        Set<Long> activeClubIdsSet = new HashSet<>(activeClubIds);
        logger.info("Démarrage de la désactivation des clubs",
                keyValue("action", "bulk_deactivate_clubs"),
                keyValue("activeClubIds", activeClubIdsSet));

        // Récupère les clubs actifs qui NE SONT PAS dans la liste d'IDs actifs
        List<Club> clubsToDeactivate = clubRepository.findByActiveTrueAndIdNotIn(activeClubIdsSet);

        if (clubsToDeactivate.isEmpty()) {
            logger.warn("Aucun club à désactiver trouvé",
                    keyValue("action", "bulk_deactivate_clubs"),
                    keyValue("nombreClubs", 0));
            return;
        }

        // Marquer chaque club comme inactif
        clubsToDeactivate.forEach(club -> club.setActive(false));
        clubRepository.saveAll(clubsToDeactivate);

        logger.info("Clubs désactivés en masse",
                keyValue("action", "bulk_deactivate_clubs"),
                keyValue("nombreClubs", clubsToDeactivate.size()));

        for (Club club : clubsToDeactivate) {
            eventPublisher.publishClubDeactivationEvent(club.getId());
            logger.info("Événement de désactivation de club publié",
                    keyValue("action", "publish_club_deactivation"),
                    keyValue("clubId", club.getId()));
        }
    }
}