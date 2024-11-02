package com.blockout.teams.services;

import com.blockout.teams.exceptions.TeamNotFoundException;
import com.blockout.teams.models.Team;
import com.blockout.teams.repositories.TeamRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TeamService {

    @Autowired
    private TeamRepository teamRepository;

    public Team createTeam(Team team) {
        return teamRepository.save(team);
    }

    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    public Optional<Team> getTeamById(Long id) {
        return teamRepository.findById(id);
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
            return teamRepository.save(team);
        }).orElseThrow(() -> new TeamNotFoundException(teamId));
    }

    public Optional<Team> getTeamsByPoolIdAndTeamName(Long pool_id, String team_name) {
        Optional<Team> team = teamRepository.findByPoolIdAndTeamNameIgnoreCase(pool_id, team_name);
        System.out.println("pool_id: " + pool_id + " team_name: " + team_name);
        System.out.println(team);
        return team;
    }

    public List<Team> getActiveTeamsByPoolId(Long poolId) {
        return teamRepository.findByPoolIdAndActive(poolId, true);
    }

}