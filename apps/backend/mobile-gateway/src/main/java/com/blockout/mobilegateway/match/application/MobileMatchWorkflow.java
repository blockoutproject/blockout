package com.blockout.mobilegateway.match.application;

import com.blockout.mobilegateway.club.application.MobileClubGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationWorkflow;
import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.pool.application.MobilePoolGateway;
import com.blockout.mobilegateway.shared.application.MobileCompetitionProjectionGateway;
import com.blockout.mobilegateway.team.application.MobileTeamGateway;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Instant;
import java.time.LocalDate;
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

/** Builds the distinct mobile match-list and match-detail projections. */
@Service
@RequiredArgsConstructor
public class MobileMatchWorkflow {

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

    private final MobileMatchGateway matches;
    private final MobilePoolGateway pools;
    private final MobileTeamGateway teams;
    private final MobileClubGateway clubs;
    private final MobileConfigurationGateway configuration;
    private final MobileCompetitionProjectionGateway competition;
    private final MobileFederationDocumentGateway documents;

    /** Builds one date-count match page while preserving downstream group order and continuation semantics. */
    public DayPageView list(
            MatchStatusEnum status, int page, int pageSize, List<Long> poolIds, List<Long> teamIds) {
        MobileMatchGateway.DayPage source = matches.listDays(status, page, pageSize, poolIds, teamIds);
        if (source.dayMatches().isEmpty()) {
            return new DayPageView(List.of(), false, null);
        }

        Set<Long> referencedPoolIds = source.dayMatches().stream()
                .flatMap(day -> day.pools().stream())
                .map(MobileMatchGateway.PoolGroup::poolId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, MobilePoolGateway.Snapshot> poolById = pools(referencedPoolIds);
        Map<Long, MobileConfigurationWorkflow.DivisionView> divisionById = divisions(poolById.values());

        Set<Long> referencedTeamIds = source.dayMatches().stream()
                .flatMap(day -> day.pools().stream())
                .flatMap(pool -> pool.matches().stream())
                .flatMap(match -> List.of(match.teamIdA(), match.teamIdB()).stream())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, MobileTeamGateway.Snapshot> teamById = teams(referencedTeamIds);
        Map<Long, String> logoByTeamId = logos(teamById.values());

        List<DayView> days = new ArrayList<>(source.dayMatches().size());
        for (MobileMatchGateway.DayGroup day : source.dayMatches()) {
            List<PoolGroupView> poolGroups = new ArrayList<>(day.pools().size());
            for (MobileMatchGateway.PoolGroup group : day.pools()) {
                MobilePoolGateway.Snapshot pool = poolById.get(group.poolId());
                if (pool == null || group.matches().isEmpty()) {
                    continue;
                }
                MobileConfigurationWorkflow.DivisionView division = divisionById.get(pool.divisionId());
                if (division == null || !Boolean.TRUE.equals(division.active())) {
                    continue;
                }
                List<MatchListView> rows = group.matches().stream()
                        .map(match -> listMatch(match, teamById, logoByTeamId))
                        .toList();
                if (!rows.isEmpty()) {
                    poolGroups.add(new PoolGroupView(listPool(pool, division), rows));
                }
            }
            if (!poolGroups.isEmpty()) {
                days.add(new DayView(day.date(), poolGroups));
            }
        }
        return new DayPageView(days, source.hasNext(), source.nextPage());
    }

    /** Builds one all-or-error match detail, ranking, and signed-document projection. */
    public DetailView get(Long id) {
        MobileMatchGateway.MatchSnapshot match = matches.find(id);
        if (match == null) {
            throw new InconsistentStateException("Match not found with ID " + id);
        }
        MobilePoolGateway.Snapshot pool = pools.find(match.poolId());
        if (pool == null) {
            throw new InconsistentStateException("Pool not found with ID " + match.poolId());
        }
        MobileConfigurationWorkflow.DivisionView division = configuration.findDivision(pool.divisionId());
        if (division == null) {
            throw new InconsistentStateException("Division not found for pool with ID " + pool.id());
        }

        List<MobileCompetitionProjectionGateway.Association> associations = competition.associationsByPool(pool.id());
        Set<Long> teamIds = associations.stream()
                .map(MobileCompetitionProjectionGateway.Association::teamId)
                .collect(Collectors.toCollection(HashSet::new));
        teamIds.add(match.teamIdA());
        teamIds.add(match.teamIdB());
        Map<Long, MobileTeamGateway.Snapshot> teamById = teams(teamIds);
        Map<Long, String> logoByTeamId = logos(teamById.values());

        DetailTeamView teamA = detailTeam(requiredTeam(teamById.get(match.teamIdA()), match.teamIdA()), logoByTeamId);
        DetailTeamView teamB = detailTeam(requiredTeam(teamById.get(match.teamIdB()), match.teamIdB()), logoByTeamId);
        List<RankingTeamView> ranking = associations.stream().sorted(RANKING_ORDER).map(association -> {
            MobileTeamGateway.Snapshot team = requiredTeam(
                    teamById.get(association.teamId()), association.teamId());
            return new RankingTeamView(
                    team.id(), team.shortName(), logoByTeamId.get(team.id()), association.points(),
                    association.played(), association.wins(), association.losses());
        }).toList();
        MobileFederationDocumentGateway.SignedDocuments signed =
                documents.sign(match.season(), match.leagueCode(), match.matchCode());

        return new DetailView(
                match.id(), match.matchDate(), match.set(), match.score(), match.status(), match.venue(),
                match.firstReferee(), match.secondReferee(), match.liveUrl(), match.liveProvider(),
                match.liveOwnerAuth0Id(), teamA, teamB,
                new DetailPoolView(
                        pool.id(), pool.season(), pool.poolCode(), pool.leagueCode(), pool.leagueName(), pool.name(),
                        pool.shortName(), pool.gender(), ranking, detailDivision(division)),
                new SignedDocumentsView(signed.addressPdfUrl(), signed.sheetPdfUrl()));
    }

    private Map<Long, MobilePoolGateway.Snapshot> pools(Set<Long> ids) {
        Map<Long, MobilePoolGateway.Snapshot> result = new HashMap<>(ids.size() * 2);
        for (Long id : ids) {
            MobilePoolGateway.Snapshot value = pools.find(id);
            if (value != null) {
                result.put(id, value);
            }
        }
        return result;
    }

    private Map<Long, MobileConfigurationWorkflow.DivisionView> divisions(
            Iterable<MobilePoolGateway.Snapshot> values) {
        Set<Long> ids = new HashSet<>();
        values.forEach(pool -> {
            if (pool.divisionId() != null) {
                ids.add(pool.divisionId());
            }
        });
        Map<Long, MobileConfigurationWorkflow.DivisionView> result = new HashMap<>(ids.size() * 2);
        for (Long id : ids) {
            MobileConfigurationWorkflow.DivisionView value = configuration.findDivision(id);
            if (value != null) {
                result.put(id, value);
            }
        }
        return result;
    }

    private Map<Long, MobileTeamGateway.Snapshot> teams(Set<Long> ids) {
        Map<Long, MobileTeamGateway.Snapshot> result = new HashMap<>(ids.size() * 2);
        for (Long id : ids) {
            if (id == null) {
                continue;
            }
            MobileTeamGateway.Snapshot value = teams.find(id);
            if (value != null) {
                result.put(id, value);
            }
        }
        return result;
    }

    private Map<Long, String> logos(Iterable<MobileTeamGateway.Snapshot> values) {
        List<MobileTeamGateway.Snapshot> teamValues = new ArrayList<>();
        values.forEach(teamValues::add);
        Set<String> clubIds = teamValues.stream()
                .filter(team -> !present(team.logoUrl()))
                .map(MobileTeamGateway.Snapshot::clubId)
                .filter(MobileMatchWorkflow::present)
                .collect(Collectors.toSet());
        Map<String, MobileClubGateway.Snapshot> clubById = new HashMap<>(clubIds.size() * 2);
        for (String clubId : clubIds) {
            MobileClubGateway.Snapshot club = clubs.find(clubId);
            if (club != null) {
                clubById.put(clubId, club);
            }
        }
        Map<Long, String> result = new HashMap<>(teamValues.size() * 2);
        for (MobileTeamGateway.Snapshot team : teamValues) {
            MobileClubGateway.Snapshot club = clubById.get(team.clubId());
            result.put(team.id(), present(team.logoUrl()) ? team.logoUrl() : club == null ? null : club.logoUrl());
        }
        return result;
    }

    private static MatchListView listMatch(
            MobileMatchGateway.MatchSnapshot match,
            Map<Long, MobileTeamGateway.Snapshot> teamById,
            Map<Long, String> logoByTeamId) {
        return new MatchListView(
                match.id(), match.matchDate(), match.set(), match.status(), match.liveUrl(),
                listTeam(teamById.get(match.teamIdA()), logoByTeamId),
                listTeam(teamById.get(match.teamIdB()), logoByTeamId));
    }

    private static ListTeamView listTeam(MobileTeamGateway.Snapshot team, Map<Long, String> logoByTeamId) {
        return team == null ? null : new ListTeamView(team.shortName(), logoByTeamId.get(team.id()));
    }

    private static ListPoolView listPool(
            MobilePoolGateway.Snapshot pool, MobileConfigurationWorkflow.DivisionView division) {
        return new ListPoolView(
                pool.id(), pool.leagueCode(), pool.leagueName(), pool.shortName(), pool.gender(),
                new ListDivisionView(
                        division.name(), division.firstGradientColor(), division.secondGradientColor(),
                        division.thirdGradientColor(), division.logoUrl()));
    }

    private static DetailTeamView detailTeam(
            MobileTeamGateway.Snapshot team, Map<Long, String> logoByTeamId) {
        return new DetailTeamView(team.id(), team.name(), team.shortName(), logoByTeamId.get(team.id()));
    }

    private static DetailDivisionView detailDivision(MobileConfigurationWorkflow.DivisionView division) {
        return new DetailDivisionView(
                division.name(), division.mainColor(), division.firstGradientColor(), division.secondGradientColor(),
                division.thirdGradientColor(), division.logoUrl());
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

    /** Match-day page view. */
    public record DayPageView(List<DayView> dayMatches, boolean hasNext, Integer nextPage) {
        public DayPageView {
            dayMatches = List.copyOf(dayMatches);
        }
    }

    /** Match-day group view. */
    public record DayView(LocalDate date, List<PoolGroupView> pools) {
        public DayView {
            pools = List.copyOf(pools);
        }
    }

    /** Match-list pool group view. */
    public record PoolGroupView(ListPoolView pool, List<MatchListView> matches) {
        public PoolGroupView {
            matches = List.copyOf(matches);
        }
    }

    /** Narrow match-list pool header. */
    public record ListPoolView(
            Long id, String leagueCode, String leagueName, String shortName, GenderEnum gender,
            ListDivisionView division) {
    }

    /** Narrow match-list division style. */
    public record ListDivisionView(
            String name, String firstGradientColor, String secondGradientColor, String thirdGradientColor,
            String logoUrl) {
    }

    /** Narrow match-list row. */
    public record MatchListView(
            Long id, Instant matchDate, String set, MatchStatusEnum status, String liveUrl,
            ListTeamView teamA, ListTeamView teamB) {
    }

    /** Nullable match-list team side. */
    public record ListTeamView(String shortName, String logoUrl) {
    }

    /** All-or-error match detail. */
    public record DetailView(
            Long id, Instant matchDate, String set, String score, MatchStatusEnum status, String venue,
            String firstReferee, String secondReferee, String liveUrl, LiveProviderEnum liveProvider,
            String liveOwnerAuth0Id, DetailTeamView teamA, DetailTeamView teamB, DetailPoolView pool,
            SignedDocumentsView signedDocuments) {
    }

    /** Match-detail team projection. */
    public record DetailTeamView(Long id, String name, String shortName, String logoUrl) {
    }

    /** Match-detail pool projection. */
    public record DetailPoolView(
            Long id, String season, String poolCode, String leagueCode, String leagueName, String name,
            String shortName, GenderEnum gender, List<RankingTeamView> ranking, DetailDivisionView division) {
        public DetailPoolView {
            ranking = List.copyOf(ranking);
        }
    }

    /** Match-detail ranking row. */
    public record RankingTeamView(
            Long id, String shortName, String logoUrl, Integer points, Integer played, Integer wins, Integer losses) {
    }

    /** Match-detail division style. */
    public record DetailDivisionView(
            String name, String mainColor, String firstGradientColor, String secondGradientColor,
            String thirdGradientColor, String logoUrl) {
    }

    /** Signed document continuation view. */
    public record SignedDocumentsView(String addressPdfUrl, String sheetPdfUrl) {
    }
}
