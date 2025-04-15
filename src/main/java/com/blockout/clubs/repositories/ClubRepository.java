package com.blockout.clubs.repositories;

import com.blockout.clubs.models.Club;

import java.util.List;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClubRepository extends JpaRepository<Club, String> {
    List<Club> findByActiveTrueAndIdIn(Set<String> ids);
}