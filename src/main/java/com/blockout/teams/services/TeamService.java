package com.blockout.teams.services;

import com.blockout.teams.exceptions.TeamNotFoundException;
import com.blockout.teams.models.Team;
import com.blockout.teams.repositories.TeamRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TeamService {

    private static final Logger logger = LoggerFactory.getLogger(TeamService.class);

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private EventPublisher eventPublisher;

    public Team createTeam(Team team) {
        return teamRepository.save(team);
    }

    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    public Optional<Team> getTeamById(Long id) {
        return teamRepository.findById(id);
    }

    public List<Team> getTeamsByPool(Long poolId) {
        return teamRepository.findByPoolId(poolId);
    }

    public Team updateTeam(Long id, Team updatedTeam) {
        return teamRepository.findById(id).map(team -> {
            team.setClubId(updatedTeam.getClubId());
            team.setTeamName(updatedTeam.getTeamName());
            team.setPoolId(updatedTeam.getPoolId());
            team.setActive(updatedTeam.getActive());
            return teamRepository.save(team);
        }).orElseThrow(() -> new TeamNotFoundException(id));
    }


    public Team deactivateTeam(Long teamId) {
        return teamRepository.findById(teamId).map(team -> {
            team.setActive(false);
            Team updatedTeam = teamRepository.save(team);
            logger.info("Team with ID: {} successfully deactivated", teamId);

            // Publier un événement de désactivation de l’équipe
            eventPublisher.publishTeamDeactivationEvent(teamId);

            return updatedTeam;
        }).orElseThrow(() -> {
            logger.error("Team with ID: {} not found. Cannot deactivate.", teamId);
            return new TeamNotFoundException(teamId);
        });
    }

    public void deactivateTeamsByPoolId(Long poolId) {
        List<Team> teams = teamRepository.findByPoolId(poolId);
        if (teams.isEmpty()) {
            logger.warn("No teams found for pool ID: {}. No deactivation performed.", poolId);
        } else {
            teams.forEach(team -> {
                team.setActive(false);
                teamRepository.save(team);
                logger.info("Team with ID: {} deactivated as part of pool deactivation for pool ID: {}", team.getId(), poolId);
            });
        }
    }

    public Optional<Team> getTeamsByPoolIdAndTeamName(Long pool_id, String team_name) {
        Optional<Team> team = teamRepository.findByPoolIdAndTeamNameIgnoreCase(pool_id, team_name);
        return team;
    }

    public List<Team> getActiveTeamsByPoolId(Long poolId) {
        return teamRepository.findByPoolIdAndActive(poolId, true);
    }

}