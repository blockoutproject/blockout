package com.blockout.teams.services;

import com.blockout.teams.exceptions.TeamNotFoundException;
import com.blockout.teams.models.Team;
import com.blockout.teams.models.enums.DivisionCode;
import com.blockout.teams.models.enums.Format;
import com.blockout.teams.models.enums.Gender;
import com.blockout.teams.repositories.TeamRepository;
import com.blockout.teams.utils.DiffUtils;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

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
        Team created = teamRepository.save(team);
        logger.info("Team created successfully",
                keyValue("action", "create_team"),
                keyValue("teamId", created.getId()));
        eventPublisher.publishTeamUpsert(created);
        return created;
    }

    /**
     * Récupère une équipe par son ID
     *
     * @param id L'identifiant de l'équipe
     * @return L'équipe correspondante
     * @throws TeamNotFoundException si l'équipe est introuvable
     */
    public Team getTeamById(Long id) {
        return teamRepository.findById(id).orElseThrow(() -> {
            logger.warn("Team not found",
                    keyValue("action", "get_team_by_id"),
                    keyValue("teamId", id));
            return new TeamNotFoundException(id);
        });
    }

    /**
     * Récupère les équipes en appliquant des filtres facultatifs
     *
     * @param name         fragment du nom (null pour ignorer)
     * @param divisionCode code de division (null pour ignorer)
     * @param format       format (null pour ignorer)
     * @param gender       genre (null pour ignorer)
     * @param clubId       identifiant du club (null pour ignorer)
     * @param ids          liste d'IDs (null pour ignorer)
     * @return Liste des équipes correspondantes
     */
    public List<Team> findTeams(String name, DivisionCode divisionCode, Format format, Gender gender, String clubId, List<Long> ids) {
        List<Long> safeIds = (ids == null) ? Collections.emptyList() : ids;

        List<Team> teams = teamRepository.findFiltered(name, divisionCode, format, gender, clubId, safeIds, safeIds.size());

        logger.debug("Listing teams",
                keyValue("action", "list_teams"),
                keyValue("name", name),
                keyValue("divisionCode", divisionCode),
                keyValue("format", format),
                keyValue("gender", gender),
                keyValue("clubId", clubId),
                keyValue("ids", safeIds),
                keyValue("resultCount", teams.size()));
        return teams;
    }

    /**
     * Met à jour une équipe existante
     *
     * @param id          L'identifiant de l'équipe
     * @param updatedTeam Les nouvelles données
     * @return L'équipe mise à jour
     * @throws TeamNotFoundException si l'équipe est introuvable
     */
    @Transactional
    public Team updateTeam(Long id, Team updatedTeam) {
        return teamRepository.findById(id).map(team -> {
            Team before = team.toBuilder().build();

            team.setClubId(updatedTeam.getClubId());
            team.setName(updatedTeam.getName());
            team.setShortName(updatedTeam.getShortName());
            team.setDivisionCode(updatedTeam.getDivisionCode());
            team.setFormat(updatedTeam.getFormat());
            team.setGender(updatedTeam.getGender());
            team.setActive(updatedTeam.getActive());

            if (!before.getActive() && team.getActive()) {
                logger.info("Team réactivée",
                        keyValue("action", "reactivate_team"),
                        keyValue("teamId", id));
            }

            Team saved = teamRepository.save(team);

            DiffUtils.logChanges(before, saved, logger, "update_team", saved.getId());
            eventPublisher.publishTeamUpsert(saved);

            return saved;
        }).orElseThrow(() -> {
            logger.error("Team not found. Cannot update.",
                    keyValue("action", "update_team"),
                    keyValue("teamId", id));
            return new TeamNotFoundException(id);
        });
    }

    /**
     * Désactive une équipe
     *
     * @param id L'identifiant de l'équipe
     * @return L'équipe désactivée
     * @throws TeamNotFoundException si l'équipe est introuvable
     */
    @Transactional
    public Team deactivateTeam(Long id) {
        return teamRepository.findById(id).map(team -> {
            team.setActive(false);
            Team updated = teamRepository.save(team);
            logger.info("Team successfully deactivated",
                    keyValue("action", "deactivate_team"),
                    keyValue("teamId", id));
            return updated;
        }).orElseThrow(() -> {
            logger.error("Team not found. Cannot deactivate.",
                    keyValue("action", "deactivate_team"),
                    keyValue("teamId", id));
            return new TeamNotFoundException(id);
        });
    }

    /**
     * Récupère les IDs uniques de clubs
     *
     * @return Liste des IDs uniques
     */
    public List<String> getUniqueClubIds() {
        return teamRepository.findDistinctClubIds();
    }

    /**
     * Incrémente le compteur de followers
     *
     * @param teamId ID de l'équipe
     * @param userId ID de l'utilisateur
     * @return Équipe mise à jour
     * @throws TeamNotFoundException si l'équipe est introuvable
     */
    @Transactional
    public Team incrementFollowersCount(Long teamId, Long userId) {
        return teamRepository.findById(teamId).map(team -> {
            team.setFollowersCount(team.getFollowersCount() + 1);
            Team updated = teamRepository.save(team);
            logger.info("Team followers incremented",
                    keyValue("action", "increment_followers_count"),
                    keyValue("teamId", teamId),
                    keyValue("userId", userId),
                    keyValue("newFollowersCount", updated.getFollowersCount()));
            return updated;
        }).orElseThrow(() -> {
            logger.error("Team not found. Cannot increment followers count.",
                    keyValue("action", "increment_followers_count"),
                    keyValue("teamId", teamId),
                    keyValue("userId", userId));
            return new TeamNotFoundException(teamId);
        });
    }

    /**
     * Décrémente le compteur de followers
     *
     * @param teamId ID de l'équipe
     * @param userId ID de l'utilisateur
     * @return Équipe mise à jour
     * @throws TeamNotFoundException si l'équipe est introuvable
     */
    @Transactional
    public Team decrementFollowersCount(Long teamId, Long userId) {
        return teamRepository.findById(teamId).map(team -> {
            long newCount = Math.max(0, team.getFollowersCount() - 1);
            team.setFollowersCount(newCount);
            Team updated = teamRepository.save(team);
            logger.info("Team followers decremented",
                    keyValue("action", "decrement_followers_count"),
                    keyValue("teamId", teamId),
                    keyValue("userId", userId),
                    keyValue("newFollowersCount", updated.getFollowersCount()));
            return updated;
        }).orElseThrow(() -> {
            logger.error("Team not found. Cannot decrement followers count.",
                    keyValue("action", "decrement_followers_count"),
                    keyValue("teamId", teamId),
                    keyValue("userId", userId));
            return new TeamNotFoundException(teamId);
        });
    }

    /**
     * Désactive toutes les équipes d’un club donné
     *
     * @param clubId Identifiant du club
     */
    @Transactional
    public void deactivateTeamsByClubId(String clubId) {
        List<Team> teams = teamRepository.findByClubIdAndActiveTrue(clubId);
        if (teams.isEmpty()) {
            logger.warn("No active teams found for club",
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
}