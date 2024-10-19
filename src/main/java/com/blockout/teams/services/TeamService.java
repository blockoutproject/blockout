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

    // Créer une nouvelle équipe
    public Team createTeam(Team team) {
        return teamRepository.save(team);
    }

    // Récupérer toutes les équipes
    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    // Récupérer une équipe par ID
    public Optional<Team> getTeamById(Long id) {
        return teamRepository.findById(id);
    }

    // Mettre à jour une équipe
    public Team updateTeam(Long id, Team updatedTeam) {
        return teamRepository.findById(id).map(team -> {
            team.setClubId(updatedTeam.getClubId());
            team.setTeamName(updatedTeam.getTeamName());
            team.setPoolId(updatedTeam.getPoolId());
            team.setActive(updatedTeam.getActive());
            return teamRepository.save(team);
        }).orElseThrow(() -> new RuntimeException("Team not found with id " + id));
    }

    // Supprimer une équipe
    public void deleteTeam(Long id) {
        teamRepository.deleteById(id);
    }
}