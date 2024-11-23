package com.blockout.teams.repositories;

import com.blockout.teams.models.Team;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    Optional<Team> findByPoolIdAndTeamNameIgnoreCase(Long poolId, String teamName);
    List<Team> findByPoolIdAndActive(Long poolId, Boolean active);
    List<Team> findByPoolId(Long poolId);
}