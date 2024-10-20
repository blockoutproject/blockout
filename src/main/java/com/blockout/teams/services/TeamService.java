package com.blockout.teams.services;

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
        }).orElseThrow(() -> new RuntimeException("Team not found with id " + id));
    }

    public void deleteTeam(Long id) {
        teamRepository.deleteById(id);
    }

    public Optional<Team> getTeamsByPoolIdAndTeamName(Long pool_id, String team_name) {
        return teamRepository.findByPoolIdAndTeamName(pool_id, team_name);
    }

    public List<Team> getActiveTeamsByPoolId(Long poolId) {
        return teamRepository.findByPoolIdAndActive(poolId, true);
    }
}