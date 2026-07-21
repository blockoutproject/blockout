package com.blockout.workersearch.projection.infrastructure.elasticsearch;

import com.blockout.workersearch.projection.application.models.ClubSearchProjection;
import com.blockout.workersearch.projection.application.models.PoolSearchProjection;
import com.blockout.workersearch.projection.application.models.TeamSearchProjection;
import com.blockout.workersearch.projection.application.ports.ProjectionIndex;
import com.blockout.workersearch.projection.infrastructure.elasticsearch.documents.ClubSearchDocument;
import com.blockout.workersearch.projection.infrastructure.elasticsearch.documents.PoolSearchDocument;
import com.blockout.workersearch.projection.infrastructure.elasticsearch.documents.TeamSearchDocument;
import com.blockout.workersearch.projection.infrastructure.elasticsearch.repositories.ClubSearchRepository;
import com.blockout.workersearch.projection.infrastructure.elasticsearch.repositories.PoolSearchRepository;
import com.blockout.workersearch.projection.infrastructure.elasticsearch.repositories.TeamSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ElasticsearchProjectionIndex implements ProjectionIndex {

    private final ClubSearchRepository clubSearchRepository;
    private final TeamSearchRepository teamSearchRepository;
    private final PoolSearchRepository poolSearchRepository;

    @Override
    public void saveClubs(List<ClubSearchProjection> clubs) {
        clubSearchRepository.saveAll(clubs.stream().map(this::toDocument).toList());
    }

    @Override
    public void saveTeams(List<TeamSearchProjection> teams) {
        teamSearchRepository.saveAll(teams.stream().map(this::toDocument).toList());
    }

    @Override
    public void savePools(List<PoolSearchProjection> pools) {
        poolSearchRepository.saveAll(pools.stream().map(this::toDocument).toList());
    }

    @Override
    public void deleteClub(String id) {
        clubSearchRepository.deleteById(id);
    }

    @Override
    public void deleteTeam(Long id) {
        teamSearchRepository.deleteById(id);
    }

    @Override
    public void deletePool(Long id) {
        poolSearchRepository.deleteById(id);
    }

    @Override
    public void deleteAllClubs() {
        clubSearchRepository.deleteAll();
    }

    @Override
    public void deleteAllTeams() {
        teamSearchRepository.deleteAll();
    }

    @Override
    public void deleteAllPools() {
        poolSearchRepository.deleteAll();
    }

    private ClubSearchDocument toDocument(ClubSearchProjection projection) {
        return ClubSearchDocument.builder()
            .id(projection.id())
            .logoUrl(projection.logoUrl())
            .name(projection.name())
            .city(projection.city())
            .build();
    }

    private TeamSearchDocument toDocument(TeamSearchProjection projection) {
        return TeamSearchDocument.builder()
            .id(projection.id())
            .name(projection.name())
            .shortName(projection.shortName())
            .clubId(projection.clubId())
            .clubName(projection.clubName())
            .clubCity(projection.clubCity())
            .logoUrl(projection.logoUrl())
            .divisionId(projection.divisionId())
            .divisionName(projection.divisionName())
            .format(projection.format())
            .gender(projection.gender())
            .season(projection.season())
            .build();
    }

    private PoolSearchDocument toDocument(PoolSearchProjection projection) {
        return PoolSearchDocument.builder()
            .id(projection.id())
            .name(projection.name())
            .shortName(projection.shortName())
            .divisionId(projection.divisionId())
            .divisionName(projection.divisionName())
            .leagueCode(projection.leagueCode())
            .leagueName(projection.leagueName())
            .season(projection.season())
            .logoUrl(projection.logoUrl())
            .format(projection.format())
            .gender(projection.gender())
            .build();
    }
}
