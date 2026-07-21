package com.blockout.workersearch.projection.application;

import com.blockout.workersearch.projection.application.models.*;
import com.blockout.workersearch.projection.application.ports.ProjectionCache;
import com.blockout.workersearch.projection.application.ports.ProjectionIndex;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class SearchProjectionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(SearchProjectionService.class);
    private static final String UNKNOWN_DIVISION = "Division inconnue";

    private final ProjectionIndex projectionIndex;
    private final ProjectionCache projectionCache;

    public void upsertClubs(List<ClubProjectionSource> clubs) {
        LOGGER.info(
            "Upserting batch of clubs",
            keyValue("action", "upsert_club_batch"),
            keyValue("count", clubs.size()));
        projectionIndex.saveClubs(clubs.stream().map(this::toClubProjection).toList());
        clubs.forEach(projectionCache::putClub);
        clubs.forEach(club -> upsertTeams(projectionCache.findTeamsByClub(club.id())));
    }

    public void upsertTeams(List<TeamProjectionSource> teams) {
        LOGGER.info(
            "Upserting batch of teams",
            keyValue("action", "upsert_team_batch"),
            keyValue("count", teams.size()));
        projectionIndex.saveTeams(teams.stream().map(this::toTeamProjection).toList());
        teams.forEach(projectionCache::putTeam);
    }

    public void upsertPools(List<PoolProjectionSource> pools) {
        LOGGER.info(
            "Upserting batch of pools",
            keyValue("action", "upsert_pool_batch"),
            keyValue("count", pools.size()));
        projectionIndex.savePools(pools.stream().map(this::toPoolProjection).toList());
    }

    public void deactivateClub(String clubId) {
        LOGGER.info("Deleting club", keyValue("action", "delete_club"), keyValue("id", clubId));
        projectionIndex.deleteClub(clubId);
        projectionCache.removeClub(clubId);
        projectionCache.removeTeamsForClub(clubId);
    }

    public void deactivateTeam(Long teamId) {
        LOGGER.info("Deleting team", keyValue("action", "delete_team"), keyValue("id", teamId));
        projectionIndex.deleteTeam(teamId);
    }

    public void deactivatePool(Long poolId) {
        LOGGER.info("Deleting pool", keyValue("action", "delete_pool"), keyValue("id", poolId));
        projectionIndex.deletePool(poolId);
    }

    public void rebuildClubs(List<ClubProjectionSource> clubs) {
        projectionIndex.deleteAllClubs();
        upsertClubs(clubs);
    }

    public void rebuildTeams(List<TeamProjectionSource> teams) {
        projectionIndex.deleteAllTeams();
        upsertTeams(teams);
    }

    public void rebuildPools(List<PoolProjectionSource> pools) {
        projectionIndex.deleteAllPools();
        upsertPools(pools);
    }

    private ClubSearchProjection toClubProjection(ClubProjectionSource club) {
        return new ClubSearchProjection(club.id(), club.logoUrl(), club.name(), club.city());
    }

    private TeamSearchProjection toTeamProjection(TeamProjectionSource team) {
        ClubProjectionSource club = projectionCache.findClub(team.clubId());
        DivisionProjectionSource division = projectionCache.findDivision(team.divisionId());
        String logoUrl = StringUtils.isNotBlank(team.logoUrl())
            ? team.logoUrl()
            : club == null ? null : club.logoUrl();

        return new TeamSearchProjection(
            team.id(),
            team.name(),
            team.shortName(),
            team.clubId(),
            club == null ? null : club.name(),
            club == null ? null : club.city(),
            logoUrl,
            division == null ? null : division.id(),
            division == null ? UNKNOWN_DIVISION : division.name(),
            team.format().name(),
            team.gender().name(),
            team.season());
    }

    private PoolSearchProjection toPoolProjection(PoolProjectionSource pool) {
        DivisionProjectionSource division = projectionCache.findDivision(pool.divisionId());
        return new PoolSearchProjection(
            pool.id(),
            pool.name(),
            pool.shortName(),
            division == null ? null : division.id(),
            division == null ? UNKNOWN_DIVISION : division.name(),
            pool.leagueCode(),
            pool.leagueName(),
            pool.season(),
            division == null ? null : division.logoUrl(),
            pool.format().name(),
            pool.gender().name());
    }
}
