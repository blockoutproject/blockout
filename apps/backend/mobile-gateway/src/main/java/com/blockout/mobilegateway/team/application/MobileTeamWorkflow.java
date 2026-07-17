package com.blockout.mobilegateway.team.application;

import com.blockout.mobilegateway.club.application.MobileClubGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationWorkflow;
import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.pool.application.MobilePoolGateway;
import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.mobilegateway.shared.application.MobileCatalogDivisionView;
import com.blockout.mobilegateway.shared.application.MobileCompetitionProjectionGateway;
import com.blockout.mobilegateway.shared.application.MobileRankingTeamView;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MobileTeamWorkflow {

    private static final Comparator<MobileCompetitionProjectionGateway.RankingRow> RANKING_ORDER =
            Comparator.comparingInt(MobileCompetitionProjectionGateway.RankingRow::points).reversed()
                    .thenComparingInt(MobileCompetitionProjectionGateway.RankingRow::pointsPenalty)
                    .thenComparing(Comparator.comparingInt(MobileCompetitionProjectionGateway.RankingRow::wins).reversed())
                    .thenComparing(Comparator.comparingDouble(
                                    MobileCompetitionProjectionGateway.RankingRow::coefSets)
                            .reversed())
                    .thenComparing(Comparator.comparingDouble(
                                    MobileCompetitionProjectionGateway.RankingRow::coefPoints)
                            .reversed());

    private final MobileTeamGateway teams;
    private final MobileClubGateway clubs;
    private final MobilePoolGateway pools;
    private final MobileConfigurationGateway configuration;
    private final MobileCompetitionProjectionGateway competition;

    public DetailView get(Long id) {
        MobileTeamGateway.Snapshot team = requiredTeam(teams.find(id), id);
        MobileCatalogDivisionView division = requiredDivision(team.divisionId(), "team " + id);
        List<MobileCompetitionProjectionGateway.PoolRanking> poolRankings = competition.rankingsByTeam(id);

        Set<Long> teamIds = poolRankings.stream()
                .flatMap(pool -> pool.ranking().stream())
                .map(MobileCompetitionProjectionGateway.RankingRow::teamId)
                .collect(Collectors.toCollection(HashSet::new));
        teamIds.add(id);
        Map<Long, MobileTeamGateway.Snapshot> teamsById = teamsById(teamIds);
        Map<Long, EnrichedTeam> enrichment = enrich(teamsById.values());

        List<PoolView> poolViews = poolRankings.stream()
                .map(group -> {
                    MobilePoolGateway.Snapshot pool = requiredPool(pools.find(group.poolId()), group.poolId());
                    return new PoolView(pool.id(), pool.leagueCode(), pool.leagueName(), pool.shortName(), pool.gender(),
                            ranking(group.ranking(), teamsById, enrichment), division);
                })
                .toList();

        EnrichedTeam enrichedTeam = enrichment.get(id);
        return new DetailView(team.id(), team.clubId(), team.name(), team.shortName(), team.rawName(), team.format(),
                team.gender(), team.season(), team.followersCount(), division,
                enrichedTeam == null ? team.logoUrl() : enrichedTeam.logoUrl(), poolViews);
    }

    public List<SummaryView> listByClub(String clubId) {
        if (clubId == null || clubId.isBlank()) {
            throw new InconsistentStateException("clubId must be a non-empty string");
        }
        List<MobileTeamGateway.Snapshot> values = teams.listActiveByClub(clubId);
        if (values.isEmpty()) {
            return List.of();
        }
        Map<Long, MobileCatalogDivisionView> divisions = divisions(values);
        MobileClubGateway.Snapshot club = clubs.find(clubId);
        return values.stream().map(team -> summary(team, divisions.get(team.divisionId()), club, true)).toList();
    }

    public List<SummaryView> listByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new InconsistentStateException("ids must be a non-empty list");
        }
        Set<Long> uniqueIds = new HashSet<>(ids);
        List<MobileTeamGateway.Snapshot> values = new ArrayList<>(uniqueIds.size());
        for (Long id : uniqueIds) {
            MobileTeamGateway.Snapshot team = teams.find(id);
            if (team != null && team.active()) {
                values.add(team);
            }
        }
        if (values.isEmpty()) {
            return List.of();
        }
        Map<Long, MobileCatalogDivisionView> divisions = divisions(values);
        Map<String, MobileClubGateway.Snapshot> clubsById = clubs(values);
        return values.stream()
                .map(team -> summary(team, divisions.get(team.divisionId()), clubsById.get(team.clubId()), false))
                .toList();
    }

    public UpdatedView update(Long id, UpdateCommand command, BinaryPart image) {
        MobileTeamGateway.Snapshot value = teams.update(id, command, image);
        return new UpdatedView(value.id(), value.name(), value.shortName(), value.logoUrl());
    }

    private SummaryView summary(
            MobileTeamGateway.Snapshot team,
            MobileCatalogDivisionView division,
            MobileClubGateway.Snapshot club,
            boolean requireClubForLogoFallback) {
        String logoUrl = present(team.logoUrl())
                ? team.logoUrl()
                : club == null ? null : club.logoUrl();
        if (requireClubForLogoFallback && !present(team.logoUrl()) && club == null) {
            throw new InconsistentStateException("Missing club with ID " + team.clubId() + " for team " + team.id());
        }
        return new SummaryView(team.id(), team.name(), team.shortName(), team.season(), team.gender(), team.format(),
                logoUrl, division);
    }

    private Map<Long, MobileCatalogDivisionView> divisions(List<MobileTeamGateway.Snapshot> values) {
        Set<Long> divisionIds = values.stream()
                .map(MobileTeamGateway.Snapshot::divisionId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, MobileCatalogDivisionView> result = new HashMap<>(divisionIds.size() * 2);
        for (Long divisionId : divisionIds) {
            MobileConfigurationWorkflow.DivisionView division = configuration.findDivision(divisionId);
            if (division != null) {
                result.put(divisionId, division(division));
            }
        }
        return result;
    }

    private Map<String, MobileClubGateway.Snapshot> clubs(List<MobileTeamGateway.Snapshot> values) {
        Set<String> clubIds = values.stream()
                .map(MobileTeamGateway.Snapshot::clubId)
                .filter(MobileTeamWorkflow::present)
                .collect(Collectors.toSet());
        Map<String, MobileClubGateway.Snapshot> result = new HashMap<>(clubIds.size() * 2);
        for (String clubId : clubIds) {
            MobileClubGateway.Snapshot club = clubs.find(clubId);
            if (club != null) {
                result.put(clubId, club);
            }
        }
        return result;
    }

    private Map<Long, MobileTeamGateway.Snapshot> teamsById(Set<Long> ids) {
        Map<Long, MobileTeamGateway.Snapshot> result = new HashMap<>(ids.size() * 2);
        for (Long id : ids) {
            MobileTeamGateway.Snapshot team = teams.find(id);
            if (team != null) {
                result.put(id, team);
            }
        }
        return result;
    }

    private Map<Long, EnrichedTeam> enrich(Iterable<MobileTeamGateway.Snapshot> values) {
        List<MobileTeamGateway.Snapshot> teamsToEnrich = new ArrayList<>();
        values.forEach(teamsToEnrich::add);
        Map<String, MobileClubGateway.Snapshot> clubsById = clubs(teamsToEnrich);
        Map<Long, EnrichedTeam> result = new HashMap<>(teamsToEnrich.size() * 2);
        for (MobileTeamGateway.Snapshot team : teamsToEnrich) {
            MobileClubGateway.Snapshot club = clubsById.get(team.clubId());
            String logoUrl = present(team.logoUrl()) ? team.logoUrl() : club == null ? null : club.logoUrl();
            result.put(team.id(), new EnrichedTeam(
                    logoUrl, club == null ? null : club.latitude(), club == null ? null : club.longitude()));
        }
        return result;
    }

    private List<MobileRankingTeamView> ranking(
            List<MobileCompetitionProjectionGateway.RankingRow> rows,
            Map<Long, MobileTeamGateway.Snapshot> teamsById,
            Map<Long, EnrichedTeam> enrichment) {
        return rows.stream().sorted(RANKING_ORDER).map(row -> {
            MobileTeamGateway.Snapshot team = requiredTeam(teamsById.get(row.teamId()), row.teamId());
            EnrichedTeam enriched = enrichment.get(team.id());
            return new MobileRankingTeamView(team.id(), team.shortName(),
                    enriched == null ? team.logoUrl() : enriched.logoUrl(), row.points(), row.played(), row.wins(),
                    row.losses(), enriched == null ? null : enriched.latitude(),
                    enriched == null ? null : enriched.longitude());
        }).toList();
    }

    private MobileCatalogDivisionView requiredDivision(Long id, String owner) {
        MobileConfigurationWorkflow.DivisionView value = configuration.findDivision(id);
        if (value == null) {
            throw new InconsistentStateException("Division not found for " + owner);
        }
        return division(value);
    }

    private static MobileCatalogDivisionView division(MobileConfigurationWorkflow.DivisionView value) {
        return new MobileCatalogDivisionView(value.name(), value.mainColor(), value.firstGradientColor(),
                value.secondGradientColor(), value.thirdGradientColor(), value.logoUrl());
    }

    private static MobileTeamGateway.Snapshot requiredTeam(MobileTeamGateway.Snapshot value, Long id) {
        if (value == null) {
            throw new InconsistentStateException("Missing team with ID " + id);
        }
        return value;
    }

    private static MobilePoolGateway.Snapshot requiredPool(MobilePoolGateway.Snapshot value, Long id) {
        if (value == null) {
            throw new InconsistentStateException("Missing pool with ID " + id);
        }
        return value;
    }

    private static boolean present(String value) {
        return value != null && !value.isBlank();
    }

    public record UpdateCommand(String name, String shortName, boolean removeLogo) {
    }

    public record UpdatedView(Long id, String name, String shortName, String logoUrl) {
    }

    public record SummaryView(
            Long id,
            String name,
            String shortName,
            String season,
            GenderEnum gender,
            FormatEnum format,
            String logoUrl,
            MobileCatalogDivisionView division) {
    }

    public record DetailView(
            Long id,
            String clubId,
            String name,
            String shortName,
            String rawName,
            FormatEnum format,
            GenderEnum gender,
            String season,
            Long followersCount,
            MobileCatalogDivisionView division,
            String logoUrl,
            List<PoolView> pools) {

        public DetailView {
            pools = pools == null ? List.of() : List.copyOf(pools);
        }
    }

    public record PoolView(
            Long id,
            String leagueCode,
            String leagueName,
            String shortName,
            GenderEnum gender,
            List<MobileRankingTeamView> ranking,
            MobileCatalogDivisionView division) {

        public PoolView {
            ranking = ranking == null ? List.of() : List.copyOf(ranking);
        }
    }

    private record EnrichedTeam(String logoUrl, Double latitude, Double longitude) {
    }
}
