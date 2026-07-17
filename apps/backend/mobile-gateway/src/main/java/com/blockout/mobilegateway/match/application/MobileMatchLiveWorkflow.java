package com.blockout.mobilegateway.match.application;

import com.blockout.mobilegateway.club.application.MobileClubGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationWorkflow;
import com.blockout.mobilegateway.pool.application.MobilePoolGateway;
import com.blockout.mobilegateway.team.application.MobileTeamGateway;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Relays live-link decisions and builds the dedicated history and moderation projections. */
@Service
@RequiredArgsConstructor
public class MobileMatchLiveWorkflow {

    private final MobileMatchLiveGateway live;
    private final MobilePoolGateway pools;
    private final MobileTeamGateway teams;
    private final MobileClubGateway clubs;
    private final MobileConfigurationGateway configuration;

    /** Relays a live-link upsert. */
    public LiveLinkView upsert(Long matchId, String url) {
        MobileMatchLiveGateway.LiveLinkView value = live.upsert(matchId, url);
        return new LiveLinkView(value.matchId(), value.provider(), value.url(), value.status());
    }

    /** Relays an idempotent live-link delete. */
    public void delete(Long matchId) {
        live.delete(matchId);
    }

    /** Relays a live-link report. */
    public void report(Long matchId, String reason) {
        live.report(matchId, reason);
    }

    /** Returns one canonical live-link history page. */
    public PageView<HistoryView> history(Long matchId, int page, int pageSize) {
        MobileMatchLiveGateway.PageView<MobileMatchLiveGateway.HistoryView> source =
                live.history(matchId, page, pageSize);
        return new PageView<>(source.items().stream()
                .map(value -> new HistoryView(
                        value.id(), value.provider(), value.url(), value.status(), value.reportCount(),
                        value.ownerAuth0Id(), value.createdAt(), value.lastUpdate()))
                .toList(), source.page(), source.pageSize(), source.hasNext(), source.totalItems());
    }

    /** Enriches one moderation page while retaining downstream page metadata after silent row drops. */
    public PageView<ModerationView> moderation(LiveLinkStatusEnum status, int page, int pageSize) {
        MobileMatchLiveGateway.PageView<MobileMatchLiveGateway.ModerationSnapshot> source =
                live.moderation(status, page, pageSize);
        if (source.items().isEmpty()) {
            return new PageView<>(List.of(), source.page(), source.pageSize(), source.hasNext(), source.totalItems());
        }

        Set<Long> poolIds = source.items().stream()
                .map(MobileMatchLiveGateway.ModerationSnapshot::poolId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, MobilePoolGateway.Snapshot> poolById = pools(poolIds);
        Map<Long, MobileConfigurationWorkflow.DivisionView> divisionById = divisions(poolById.values());

        Set<Long> teamIds = source.items().stream()
                .flatMap(value -> List.of(value.teamIdA(), value.teamIdB()).stream())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, MobileTeamGateway.Snapshot> teamById = teams(teamIds);
        Map<Long, String> logoByTeamId = logos(teamById.values());

        List<ModerationView> items = new ArrayList<>(source.items().size());
        for (MobileMatchLiveGateway.ModerationSnapshot value : source.items()) {
            MobilePoolGateway.Snapshot pool = poolById.get(value.poolId());
            if (pool == null) {
                continue;
            }
            MobileConfigurationWorkflow.DivisionView division = divisionById.get(pool.divisionId());
            if (division == null || !Boolean.TRUE.equals(division.active())) {
                continue;
            }
            MobileTeamGateway.Snapshot teamA = teamById.get(value.teamIdA());
            MobileTeamGateway.Snapshot teamB = teamById.get(value.teamIdB());
            if (teamA == null || teamB == null) {
                continue;
            }
            items.add(new ModerationView(
                    value.id(), value.matchDate(), value.season(), value.set(), value.lastLiveLinkStatus(),
                    value.lastLiveLinkCreatedAt(), team(teamA, logoByTeamId), team(teamB, logoByTeamId),
                    new ModerationPoolView(
                            pool.shortName(), pool.leagueName(),
                            new ModerationDivisionView(
                                    division.name(), division.firstGradientColor(), division.secondGradientColor(),
                                    division.thirdGradientColor()))));
        }
        return new PageView<>(items, source.page(), source.pageSize(), source.hasNext(), source.totalItems());
    }

    /** Relays approval to the live-link owner. */
    public void approve(Long liveLinkId) {
        live.approve(liveLinkId);
    }

    /** Relays rejection to the live-link owner. */
    public void reject(Long liveLinkId) {
        live.reject(liveLinkId);
    }

    /** Relays reactivation to the live-link owner. */
    public void reactivate(Long liveLinkId) {
        live.reactivate(liveLinkId);
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
                .filter(MobileMatchLiveWorkflow::present)
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

    private static ModerationTeamView team(
            MobileTeamGateway.Snapshot team, Map<Long, String> logoByTeamId) {
        return new ModerationTeamView(team.name(), team.shortName(), logoByTeamId.get(team.id()));
    }

    private static boolean present(String value) {
        return value != null && !value.isBlank();
    }

    /** Live-link command result. */
    public record LiveLinkView(Long matchId, LiveProviderEnum provider, String url, LiveLinkStatusEnum status) {
    }

    /** Live-link history row. */
    public record HistoryView(
            Long id, LiveProviderEnum provider, String url, LiveLinkStatusEnum status, Integer reportCount,
            String ownerAuth0Id, Instant createdAt, Instant lastUpdate) {
    }

    /** Moderation card. */
    public record ModerationView(
            Long id, Instant matchDate, String season, String set, LiveLinkStatusEnum lastLiveLinkStatus,
            Instant lastLiveLinkCreatedAt, ModerationTeamView teamA, ModerationTeamView teamB,
            ModerationPoolView pool) {
    }

    /** Moderation team projection. */
    public record ModerationTeamView(String name, String shortName, String logoUrl) {
    }

    /** Moderation pool projection. */
    public record ModerationPoolView(String shortName, String leagueName, ModerationDivisionView division) {
    }

    /** Moderation division projection. */
    public record ModerationDivisionView(
            String name, String firstGradientColor, String secondGradientColor, String thirdGradientColor) {
    }

    /** Canonical page metadata retained after projection. */
    public record PageView<T>(List<T> items, int page, int pageSize, boolean hasNext, Long totalItems) {
        public PageView {
            items = List.copyOf(items);
        }
    }
}
