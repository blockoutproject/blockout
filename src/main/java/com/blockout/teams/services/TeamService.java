package com.blockout.teams.services;

import com.blockout.teams.exceptions.TeamNotFoundException;
import com.blockout.teams.models.Team;
import com.blockout.teams.models.TeamFormat;
import com.blockout.teams.models.TeamGender;
import com.blockout.teams.repositories.TeamRepository;
import com.blockout.teams.utils.DiffUtils;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamService {

    private static final Logger logger = LoggerFactory.getLogger(TeamService.class);

    private final TeamRepository teamRepository;
    private final EventPublisher eventPublisher;

    /**
     * Crée une nouvelle équipe
     * 
     * @param team L'objet Team à créer
     * @return L'équipe créée avec son ID généré
     */
    @Transactional
    public Team createTeam(Team team) {
        Team createdTeam = teamRepository.save(team);
        logger.info("Team created successfully",
                keyValue("action", "create_team"),
                keyValue("teamId", createdTeam.getId()));

        // Publier l'événement de création de l'équipe
        eventPublisher.publishTeamUpsert(createdTeam);

        return createdTeam;
    }

    /**
     * Récupère les équipes en appliquant des filtres facultatifs.
     *
     * @param name         fragment de nom (null pour ignorer)
     * @param divisionName nom de division exact (null pour ignorer)
     * @param format       format de l'équipe (null pour ignorer)
     * @param gender       genre de l'équipe (null pour ignorer)
     * @param ids          liste d'IDs (null ou vide pour ignorer)
     * @return liste des équipes correspondant aux critères
     */
    public List<Team> findTeams(String name,
            String divisionName,
            TeamFormat format,
            TeamGender gender,
            String clubId,
            List<Long> ids) {

        List<Long> safeIds = (ids == null) ? Collections.emptyList() : ids;

        List<Team> teams = teamRepository.findFiltered(
                name,
                divisionName,
                format,
                gender,
                clubId,
                safeIds,
                safeIds.size());

        logger.debug("findTeams executed",
                keyValue("action", "find_teams"),
                keyValue("name", name),
                keyValue("divisionName", divisionName),
                keyValue("format", format),
                keyValue("gender", gender),
                keyValue("ids", safeIds),
                keyValue("resultCount", teams.size()));

        return teams;
    }

    /**
     * Récupère les équipes par leurs IDs
     * 
     * @param ids Liste d'identifiants d'équipes
     * @return Liste des équipes correspondantes
     */
    public List<Team> getTeamsByIds(List<Long> ids) {
        List<Team> teams = teamRepository.findAllById(ids);

        Set<Long> foundIds = teams.stream()
                .map(Team::getId)
                .collect(Collectors.toSet());

        List<Long> missingIds = ids.stream()
                .filter(id -> !foundIds.contains(id))
                .collect(Collectors.toList());

        if (!missingIds.isEmpty()) {
            logger.warn("Some teams not found for given IDs",
                    keyValue("action", "get_teams_by_ids"),
                    keyValue("missingIds", missingIds));
        }

        return teams;
    }

    /**
     * Récupère une équipe par son ID
     * 
     * @param id L'identifiant de l'équipe
     * @return Optional contenant l'équipe si elle existe
     */
    public Optional<Team> getTeamById(Long id) {
        Optional<Team> teamOpt = teamRepository.findById(id);
        if (!teamOpt.isPresent()) {
            logger.warn("No team found with given ID",
                    keyValue("action", "get_team_by_id"),
                    keyValue("teamId", id));
        }
        return teamOpt;
    }

    /**
     * Met à jour une équipe existante
     *
     * @param id          L'identifiant de l'équipe à mettre à jour
     * @param updatedTeam Les nouvelles données de l'équipe
     * @return L'équipe mise à jour
     * @throws TeamNotFoundException Si l'équipe n'existe pas
     */
    @Transactional
    public Optional<Team> updateTeam(Long id, Team updatedTeam) {
        return teamRepository.findById(id).map(team -> {
            Team before = team.toBuilder().build();

            team.setClubId(updatedTeam.getClubId());
            team.setName(updatedTeam.getName());
            team.setShortName(updatedTeam.getShortName());
            team.setDivisionName(updatedTeam.getDivisionName());
            team.setFormat(updatedTeam.getFormat());
            team.setGender(updatedTeam.getGender());
            team.setActive(updatedTeam.getActive());

            if (!before.getActive() && team.getActive()) {
                logger.info("Équipe réactivée",
                        keyValue("action", "reactivate_team"),
                        keyValue("teamId", id));
            }

            Team savedTeam = teamRepository.save(team);

            DiffUtils.logChanges(before, savedTeam, logger,
                    "update_team", savedTeam.getId());

            // Publier l'événement de mise à jour de l'équipe
            eventPublisher.publishTeamUpsert(savedTeam);
                    
            return savedTeam;
        });
    }

    /**
     * Désactive une équipe
     * 
     * @param teamId L'identifiant de l'équipe à désactiver
     * @return L'équipe désactivée
     * @throws TeamNotFoundException Si l'équipe n'existe pas
     */
    @Transactional
    public Team deactivateTeam(Long teamId) {
        return teamRepository.findById(teamId).map(team -> {
            team.setActive(false);
            Team updatedTeam = teamRepository.save(team);

            logger.info("Team successfully deactivated",
                    keyValue("action", "deactivate_team"),
                    keyValue("teamId", teamId));

            return updatedTeam;
        }).orElseThrow(() -> {
            logger.error("Team not found. Cannot deactivate.",
                    keyValue("action", "deactivate_team"),
                    keyValue("teamId", teamId));
            return new TeamNotFoundException(teamId);
        });
    }

    /**
     * Incrémente le compteur de followers pour l'équipe.
     * 
     * @param teamId Identifiant de l'équipe
     * @param userId Identifiant de l'utilisateur qui follow
     * @return L'équipe mise à jour
     * @throws TeamNotFoundException Si l'équipe n'existe pas
     */
    @Transactional
    public Team incrementFollowersCount(Long teamId, Long userId) {
        return teamRepository.findById(teamId).map(team -> {
            long currentCount = team.getFollowersCount();
            team.setFollowersCount(currentCount + 1);

            Team updatedTeam = teamRepository.save(team);
            logger.info("Team followers count incremented",
                    keyValue("action", "increment_followers_count"),
                    keyValue("teamId", teamId),
                    keyValue("userId", userId),
                    keyValue("newFollowersCount", updatedTeam.getFollowersCount()));

            return updatedTeam;
        }).orElseThrow(() -> {
            logger.error("Team not found. Cannot increment followers count.",
                    keyValue("action", "increment_followers_count"),
                    keyValue("teamId", teamId),
                    keyValue("userId", userId));
            return new TeamNotFoundException(teamId);
        });
    }

    /**
     * Décrémente le compteur de followers pour l'équipe.
     * 
     * @param teamId Identifiant de l'équipe
     * @param userId Identifiant de l'utilisateur qui unfollow
     * @return L'équipe mise à jour
     * @throws TeamNotFoundException Si l'équipe n'existe pas
     */
    @Transactional
    public Team decrementFollowersCount(Long teamId, Long userId) {
        return teamRepository.findById(teamId).map(team -> {
            long currentCount = team.getFollowersCount();
            long newCount = (currentCount > 0) ? currentCount - 1 : 0;
            team.setFollowersCount(newCount);

            Team updatedTeam = teamRepository.save(team);
            logger.info("Team followers count decremented",
                    keyValue("action", "decrement_followers_count"),
                    keyValue("teamId", teamId),
                    keyValue("userId", userId),
                    keyValue("newFollowersCount", updatedTeam.getFollowersCount()));

            return updatedTeam;
        }).orElseThrow(() -> {
            logger.error("Team not found. Cannot decrement followers count.",
                    keyValue("action", "decrement_followers_count"),
                    keyValue("teamId", teamId),
                    keyValue("userId", userId));
            return new TeamNotFoundException(teamId);
        });
    }

    /**
     * Désactive toutes les équipes d'un club donné.
     *
     * @param clubId L'identifiant du club
     */
    @Transactional
    public void deactivateTeamsByClubId(String clubId) {
        List<Team> teams = teamRepository.findByClubIdAndActiveTrue(clubId);
        if (teams.isEmpty()) {
            logger.warn("No active teams found for club ID. No deactivation performed.",
                    keyValue("action", "deactivate_teams_by_club"),
                    keyValue("clubId", clubId));
        } else {
            teams.forEach(team -> {
                team.setActive(false);
                teamRepository.save(team);
                logger.info("Team deactivated as part of club deactivation",
                        keyValue("action", "deactivate_teams_by_club"),
                        keyValue("teamId", team.getId()),
                        keyValue("clubId", clubId));
            });
        }
    }

    /**
     * Récupère les IDs de clubs uniques
     * 
     * @return Liste des IDs de clubs uniques
     */
    public List<String> getUniqueClubIds() {
        return teamRepository.findDistinctClubIds();
    }
}