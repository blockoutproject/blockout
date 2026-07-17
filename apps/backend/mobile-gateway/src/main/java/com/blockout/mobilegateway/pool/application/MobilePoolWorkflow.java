package com.blockout.mobilegateway.pool.application;

import com.blockout.mobilegateway.club.application.MobileClubGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationWorkflow;
import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.shared.application.MobileCatalogDivisionView;
import com.blockout.mobilegateway.shared.application.MobileCompetitionProjectionGateway;
import com.blockout.mobilegateway.shared.application.MobileRankingTeamView;
import com.blockout.mobilegateway.team.application.MobileTeamGateway;
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
public class MobilePoolWorkflow {

    private static final Comparator<MobileCompetitionProjectionGateway.Association> RANKING_ORDER =
            Comparator.comparingInt(MobileCompetitionProjectionGateway.Association::points).reversed()
                    .thenComparingInt(MobileCompetitionProjectionGateway.Association::pointsPenalty)
                    .thenComparing(Comparator.comparingInt(
                                    MobileCompetitionProjectionGateway.Association::wins)
                            .reversed())
                    .thenComparing(Comparator.comparingDouble(
                                    MobileCompetitionProjectionGateway.Association::coefSets)
                            .reversed())
                    .thenComparing(Comparator.comparingDouble(
                                    MobileCompetitionProjectionGateway.Association::coefPoints)
                            .reversed());

    private final MobilePoolGateway pools;
    private final MobileTeamGateway teams;
    private final MobileClubGateway clubs;
    private final MobileConfigurationGateway configuration;
    private final MobileCompetitionProjectionGateway competition;

    public DetailView get(Long id) {
        MobilePoolGateway.Snapshot pool = requiredPool(pools.find(id), id);
        MobileCatalogDivisionView division = requiredDivision(pool.divisionId(), "pool " + id);
        List<MobileCompetitionProjectionGateway.Association> associations = competition.associationsByPool(id);
        Map<Long, MobileTeamGateway.Snapshot> teamsById = teamsById(associations.stream()
                .map(MobileCompetitionProjectionGateway.Association::teamId)
                .collect(Collectors.toSet()));
        Map<Long, EnrichedTeam> enrichment = enrich(teamsById.values());
        List<MobileRankingTeamView> ranking = associations.stream().sorted(RANKING_ORDER).map(association -> {
            MobileTeamGateway.Snapshot team = requiredTeam(teamsById.get(association.teamId()), association.teamId());
            EnrichedTeam enriched = enrichment.get(team.id());
            return new MobileRankingTeamView(team.id(), team.shortName(),
                    enriched == null ? team.logoUrl() : enriched.logoUrl(), association.points(), association.played(),
                    association.wins(), association.losses(), enriched == null ? null : enriched.latitude(),
                    enriched == null ? null : enriched.longitude());
        }).toList();
        return new DetailView(pool.id(), pool.season(), pool.leagueCode(), pool.leagueName(), pool.name(),
                pool.shortName(), pool.rawName(), pool.gender(), pool.followersCount(), ranking, division);
    }

    public List<SummaryView> listByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new InconsistentStateException("ids must be a non-empty list");
        }
        Set<Long> uniqueIds = new HashSet<>(ids);
        List<MobilePoolGateway.Snapshot> values = new ArrayList<>(uniqueIds.size());
        for (Long id : uniqueIds) {
            MobilePoolGateway.Snapshot pool = pools.find(id);
            if (pool != null && pool.active()) {
                values.add(pool);
            }
        }
        if (values.isEmpty()) {
            return List.of();
        }
        Map<Long, MobileCatalogDivisionView> divisions = divisions(values);
        return values.stream()
                .map(pool -> new SummaryView(pool.id(), pool.name(), pool.leagueName(), pool.leagueCode(), pool.season(),
                        pool.gender(), pool.format(), divisions.get(pool.divisionId())))
                .toList();
    }

    public UpdatedView update(Long id, UpdateCommand command) {
        MobilePoolGateway.Snapshot value = pools.update(id, command);
        return new UpdatedView(value.id(), value.name(), value.shortName());
    }

    private Map<Long, MobileCatalogDivisionView> divisions(List<MobilePoolGateway.Snapshot> values) {
        Set<Long> divisionIds = values.stream()
                .map(MobilePoolGateway.Snapshot::divisionId)
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
        Set<String> clubIds = teamsToEnrich.stream()
                .map(MobileTeamGateway.Snapshot::clubId)
                .filter(MobilePoolWorkflow::present)
                .collect(Collectors.toSet());
        Map<String, MobileClubGateway.Snapshot> clubsById = new HashMap<>(clubIds.size() * 2);
        for (String clubId : clubIds) {
            MobileClubGateway.Snapshot club = clubs.find(clubId);
            if (club != null) {
                clubsById.put(clubId, club);
            }
        }
        Map<Long, EnrichedTeam> result = new HashMap<>(teamsToEnrich.size() * 2);
        for (MobileTeamGateway.Snapshot team : teamsToEnrich) {
            MobileClubGateway.Snapshot club = clubsById.get(team.clubId());
            String logoUrl = present(team.logoUrl()) ? team.logoUrl() : club == null ? null : club.logoUrl();
            result.put(team.id(), new EnrichedTeam(
                    logoUrl, club == null ? null : club.latitude(), club == null ? null : club.longitude()));
        }
        return result;
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

    private static MobilePoolGateway.Snapshot requiredPool(MobilePoolGateway.Snapshot value, Long id) {
        if (value == null) {
            throw new InconsistentStateException("Pool not found with ID " + id);
        }
        return value;
    }

    private static MobileTeamGateway.Snapshot requiredTeam(MobileTeamGateway.Snapshot value, Long id) {
        if (value == null) {
            throw new InconsistentStateException("Missing team with ID " + id);
        }
        return value;
    }

    private static boolean present(String value) {
        return value != null && !value.isBlank();
    }

    public record UpdateCommand(String name, String shortName) {
    }

    public record UpdatedView(Long id, String name, String shortName) {
    }

    public record SummaryView(
            Long id,
            String name,
            String leagueName,
            String leagueCode,
            String season,
            GenderEnum gender,
            FormatEnum format,
            MobileCatalogDivisionView division) {
    }

    public record DetailView(
            Long id,
            String season,
            String leagueCode,
            String leagueName,
            String name,
            String shortName,
            String rawName,
            GenderEnum gender,
            Long followersCount,
            List<MobileRankingTeamView> ranking,
            MobileCatalogDivisionView division) {

        public DetailView {
            ranking = ranking == null ? List.of() : List.copyOf(ranking);
        }
    }

    private record EnrichedTeam(String logoUrl, Double latitude, Double longitude) {
    }
}
