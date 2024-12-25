package com.blockout.teams.services;

import com.blockout.teams.exceptions.TeamNotFoundException;
import com.blockout.teams.models.Team;
import com.blockout.teams.models.TeamFormat;
import com.blockout.teams.models.TeamGender;
import com.blockout.teams.repositories.TeamRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
public class TeamService {

    private static final Logger logger = LoggerFactory.getLogger(TeamService.class);

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private EventPublisher eventPublisher;

    public Team createTeam(Team team) {
        Team createdTeam = teamRepository.save(team);
        logger.info("Team created successfully",
                keyValue("action", "create_team"),
                keyValue("teamId", createdTeam.getId()));
        return createdTeam;
    }

    public List<Team> getAllTeams() {
        List<Team> teams = teamRepository.findAll();
        return teams;
    }

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

    public Optional<Team> getTeamById(Long id) {
        Optional<Team> teamOpt = teamRepository.findById(id);
        if (!teamOpt.isPresent()) {
            logger.warn("No team found with given ID",
                    keyValue("action", "get_team_by_id"),
                    keyValue("teamId", id));
        }
        return teamOpt;
    }

    public List<Team> getTeamsByPool(Long poolId) {
        List<Team> teams = teamRepository.findByPoolId(poolId);
        if (teams.isEmpty()) {
            logger.warn("No teams found for pool ID",
                    keyValue("action", "get_teams_by_pool"),
                    keyValue("poolId", poolId));
        } else {
            logger.info("Teams retrieved by pool ID",
                    keyValue("action", "get_teams_by_pool"),
                    keyValue("poolId", poolId),
                    keyValue("count", teams.size()));
        }
        return teams;
    }

    public Team updateTeam(Long id, Team updatedTeam) {
        return teamRepository.findById(id).map(team -> {
            team.setClubId(updatedTeam.getClubId());
            team.setTeamName(updatedTeam.getTeamName());
            team.setPoolId(updatedTeam.getPoolId());
            team.setDivisionName(updatedTeam.getDivisionName());
            team.setFormat(updatedTeam.getFormat());
            team.setGender(updatedTeam.getGender());
            team.setActive(updatedTeam.getActive());
            Team savedTeam = teamRepository.save(team);

            logger.info("Team updated successfully",
                    keyValue("action", "update_team"),
                    keyValue("teamId", savedTeam.getId()));
            return savedTeam;
        }).orElseThrow(() -> {
            logger.error("Team not found, cannot update",
                    keyValue("action", "update_team"),
                    keyValue("teamId", id));
            return new TeamNotFoundException(id);
        });
    }

    public Team deactivateTeam(Long teamId) {
        return teamRepository.findById(teamId).map(team -> {
            team.setActive(false);
            Team updatedTeam = teamRepository.save(team);

            logger.info("Team successfully deactivated",
                    keyValue("action", "deactivate_team"),
                    keyValue("teamId", teamId));

            // Publier un événement de désactivation de l’équipe
            eventPublisher.publishTeamDeactivationEvent(teamId);

            return updatedTeam;
        }).orElseThrow(() -> {
            logger.error("Team not found. Cannot deactivate.",
                    keyValue("action", "deactivate_team"),
                    keyValue("teamId", teamId));
            return new TeamNotFoundException(teamId);
        });
    }

    public void deactivateTeamsByPoolId(Long poolId) {
        List<Team> teams = teamRepository.findByPoolId(poolId);
        if (teams.isEmpty()) {
            logger.warn("No teams found for pool ID. No deactivation performed.",
                    keyValue("action", "deactivate_teams_by_pool"),
                    keyValue("poolId", poolId));
        } else {
            teams.forEach(team -> {
                team.setActive(false);
                teamRepository.save(team);
                logger.info("Team deactivated as part of pool deactivation",
                        keyValue("action", "deactivate_team"),
                        keyValue("teamId", team.getId()),
                        keyValue("poolId", poolId));
            });
        }
    }

    public Optional<Team> getTeamsByPoolIdAndTeamName(Long pool_id, String team_name) {
        Optional<Team> teamOpt = teamRepository.findByPoolIdAndTeamNameIgnoreCase(pool_id, team_name);
        if (!teamOpt.isPresent()) {
            logger.warn("No team found for given poolId and teamName",
                    keyValue("action", "get_team_by_pool_and_name"),
                    keyValue("poolId", pool_id),
                    keyValue("teamName", team_name));
        }
        return teamOpt;
    }

    public List<Team> getActiveTeamsByPoolId(Long poolId) {
        List<Team> teams = teamRepository.findByPoolIdAndActive(poolId, true);
        return teams;
    }

    public List<Team> getTeamsByDivisionFormatGender(String divisionName, TeamFormat format, TeamGender gender) {
        List<Team> teams = teamRepository.findByDivisionNameAndFormatAndGender(divisionName, format, gender);
        if (teams.isEmpty()) {
            logger.warn("No teams found for given divisionName, format, and gender",
                    keyValue("action", "get_teams_by_division_format_gender"),
                    keyValue("divisionName", divisionName),
                    keyValue("format", format),
                    keyValue("gender", gender));
        }
        return teams;
    }

}