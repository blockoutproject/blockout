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

    public Team updateTeam(Long id, Team updatedTeam) {
        return teamRepository.findById(id).map(team -> {
            team.setClubId(updatedTeam.getClubId());
            team.setName(updatedTeam.getName());
            team.setShortName(updatedTeam.getShortName());
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

            return updatedTeam;
        }).orElseThrow(() -> {
            logger.error("Team not found. Cannot deactivate.",
                    keyValue("action", "deactivate_team"),
                    keyValue("teamId", teamId));
            return new TeamNotFoundException(teamId);
        });
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