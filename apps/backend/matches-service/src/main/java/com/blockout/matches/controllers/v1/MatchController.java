package com.blockout.matches.controllers.v1;

import com.blockout.matches.match.application.CreateMatchCommand;
import com.blockout.matches.match.application.DeactivateMatchesCommand;
import com.blockout.matches.match.application.MatchApplicationService;
import com.blockout.matches.match.application.MatchDayPage;
import com.blockout.matches.match.application.MatchDayPoolView;
import com.blockout.matches.match.application.MatchDayView;
import com.blockout.matches.match.application.MatchDetailView;
import com.blockout.matches.match.application.MatchQuery;
import com.blockout.matches.match.application.MatchSnapshot;
import com.blockout.matches.match.application.UpdateMatchCommand;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationApplicationService;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationView;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.shared.api.v1.LegacyMatchesJson;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.MatchStatusEnum;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/matches", produces = MediaType.APPLICATION_JSON_VALUE)
public class MatchController {

    private final MatchApplicationService matches;
    private final MatchLiveModerationApplicationService liveModeration;
    private final LegacyMatchesJson json;

    @GetMapping
    public ResponseEntity<String> listMatches(
            @RequestParam(required = false, name = "pool_id") Long poolId,
            @RequestParam(required = false, name = "team_ids") List<Long> teamIds,
            @RequestParam(required = false) MatchStatus status,
            @RequestParam(required = false) Boolean active) throws JsonProcessingException {
        List<LegacyMatchResponse> response = matches.findAll(
                new MatchQuery(poolId, teamIds, applicationStatus(status), active)).stream()
                .map(this::legacyResponse)
                .toList();
        return ResponseEntity.ok(json.write(response));
    }

    @GetMapping("/day-groups")
    public ResponseEntity<String> dayGroups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "4") int size,
            @RequestParam(required = false, name = "pool_ids") List<Long> poolIds,
            @RequestParam(required = false, name = "team_ids") List<Long> teamIds,
            @RequestParam(required = false) MatchStatus status,
            @RequestParam(required = false) Boolean active) throws JsonProcessingException {
        MatchDayPage result = matches.findDayPage(new com.blockout.matches.match.application.MatchDayQuery(
                poolIds == null ? Collections.emptyList() : poolIds,
                teamIds == null ? Collections.emptyList() : teamIds,
                applicationStatus(status), page, size, active));
        return ResponseEntity.ok(json.write(new LegacyDayPageResponse(
                result.dayMatches().stream().map(this::legacyResponse).toList(),
                result.hasNext(), result.nextPage())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> getMatchById(@PathVariable Long id) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(legacyResponse(matches.findDetail(id))));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('SCOPE_create:matches')")
    public ResponseEntity<String> createMatch(@RequestBody String body) throws JsonProcessingException {
        LegacyMatchRequest request = json.read(body, LegacyMatchRequest.class);
        MatchSnapshot created = matches.createLegacy(request.createCommand(), request.active());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(json.write(legacyResponse(created)));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('SCOPE_update:matches')")
    public ResponseEntity<String> updateMatch(@PathVariable Long id, @RequestBody String body)
            throws JsonProcessingException {
        LegacyMatchRequest request = json.read(body, LegacyMatchRequest.class);
        return ResponseEntity.ok(json.write(legacyResponse(matches.update(id, request.updateCommand()))));
    }

    @PutMapping(value = "/pools/{poolId}/bulk-deactivate", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('SCOPE_delete:matches')")
    public ResponseEntity<Void> bulkDeactivateMatches(@PathVariable Long poolId, @RequestBody String body)
            throws JsonProcessingException {
        LegacyBulkDeactivateRequest request = json.read(body, LegacyBulkDeactivateRequest.class);
        matches.deactivate(DeactivateMatchesCommand.from(poolId, request.missingMatchCodes()));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/live-moderation")
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    public ResponseEntity<String> listMatchesForLiveModeration(
            @RequestParam(value = "status", required = false) LiveLinkStatus statusFilter)
            throws JsonProcessingException {
        LiveLinkStatusEnum status = statusFilter == null
                ? null
                : LiveLinkStatusEnum.fromValue(statusFilter.name());
        return ResponseEntity.ok(json.write(liveModeration.findAll(status).stream()
                .map(this::legacyResponse)
                .toList()));
    }

    private LegacyMatchResponse legacyResponse(MatchSnapshot match) {
        return new LegacyMatchResponse(match.id(), match.matchCode(), match.leagueCode(), match.poolId(),
                match.liveCode(), match.teamIdA(), match.teamIdB(), match.matchDate(), match.season(), match.set(),
                match.score(), match.status() == null ? null : MatchStatus.valueOf(match.status().getValue()),
                match.venue(), match.firstReferee(), match.secondReferee(), match.active(), match.createdAt(),
                match.lastUpdate());
    }

    private LegacyMatchDetailResponse legacyResponse(MatchDetailView match) {
        return new LegacyMatchDetailResponse(match.id(), match.matchCode(), match.leagueCode(), match.poolId(),
                match.liveCode(), match.teamIdA(), match.teamIdB(), match.matchDate(), match.season(), match.set(),
                match.score(), MatchStatus.valueOf(match.status().getValue()), match.venue(), match.firstReferee(),
                match.secondReferee(), match.liveUrl(),
                match.liveProvider() == null ? null : LiveProvider.valueOf(match.liveProvider().getValue()),
                match.liveOwnerAuth0Id());
    }

    private LegacyMatchLiveModerationResponse legacyResponse(MatchLiveModerationView match) {
        return new LegacyMatchLiveModerationResponse(
                match.id(), match.matchCode(), match.leagueCode(), match.poolId(), match.teamIdA(), match.teamIdB(),
                match.matchDate(), match.season(), match.set(), match.score(),
                match.status() == null ? null : MatchStatus.valueOf(match.status().getValue()), match.liveCode(),
                match.lastLiveLinkId(),
                match.lastLiveLinkStatus() == null
                        ? null
                        : LiveLinkStatus.valueOf(match.lastLiveLinkStatus().getValue()),
                match.lastLiveLinkProvider() == null
                        ? null
                        : LiveProvider.valueOf(match.lastLiveLinkProvider().getValue()),
                match.lastLiveLinkUrl(), match.lastLiveLinkOwnerAuth0Id(), match.lastLiveLinkCreatedAt());
    }

    private LegacyDayResponse legacyResponse(MatchDayView day) {
        return new LegacyDayResponse(day.date(), day.pools().stream().map(this::legacyResponse).toList());
    }

    private LegacyPoolResponse legacyResponse(MatchDayPoolView pool) {
        return new LegacyPoolResponse(pool.poolId(), pool.matches().stream().map(this::legacyResponse).toList());
    }

    private MatchStatusEnum applicationStatus(MatchStatus status) {
        return status == null ? null : MatchStatusEnum.fromValue(status.name());
    }

    record LegacyBulkDeactivateRequest(List<String> missingMatchCodes) {
    }

    record LegacyDayPageResponse(List<LegacyDayResponse> dayMatches, boolean hasNext, Integer nextPage) {
    }

    record LegacyDayResponse(LocalDate date, List<LegacyPoolResponse> pools) {
    }

    record LegacyPoolResponse(Long poolId, List<LegacyMatchDetailResponse> matches) {
    }

    record LegacyMatchDetailResponse(
            Long id,
            String matchCode,
            String leagueCode,
            Long poolId,
            Long liveCode,
            Long teamIdA,
            Long teamIdB,
            Instant matchDate,
            String season,
            String set,
            String score,
            MatchStatus status,
            String venue,
            String firstReferee,
            String secondReferee,
            String liveUrl,
            LiveProvider liveProvider,
            String liveOwnerAuth0Id) {
    }

    record LegacyMatchResponse(
            Long id,
            String matchCode,
            String leagueCode,
            Long poolId,
            Long liveCode,
            Long teamIdA,
            Long teamIdB,
            Instant matchDate,
            String season,
            String set,
            String score,
            MatchStatus status,
            String venue,
            String firstReferee,
            String secondReferee,
            Boolean active,
            Instant createdAt,
            Instant lastUpdate) {
    }

    record LegacyMatchLiveModerationResponse(
            Long id,
            String matchCode,
            String leagueCode,
            Long poolId,
            Long teamIdA,
            Long teamIdB,
            Instant matchDate,
            String season,
            String set,
            String score,
            MatchStatus status,
            Long liveCode,
            Long lastLiveLinkId,
            LiveLinkStatus lastLiveLinkStatus,
            LiveProvider lastLiveLinkProvider,
            String lastLiveLinkUrl,
            String lastLiveLinkOwnerAuth0Id,
            Instant lastLiveLinkCreatedAt) {
    }

    record LegacyMatchRequest(
            Long id,
            String matchCode,
            String leagueCode,
            Long poolId,
            Long liveCode,
            Long teamIdA,
            Long teamIdB,
            Instant matchDate,
            String season,
            String set,
            String score,
            MatchStatus status,
            String venue,
            String firstReferee,
            String secondReferee,
            Boolean active,
            Instant createdAt,
            Instant lastUpdate) {

        CreateMatchCommand createCommand() {
            return new CreateMatchCommand(matchCode, leagueCode, poolId, liveCode, teamIdA, teamIdB, matchDate,
                    season, set, score, venue, firstReferee, secondReferee);
        }

        UpdateMatchCommand updateCommand() {
            return new UpdateMatchCommand(matchCode, leagueCode, poolId, liveCode, teamIdA, teamIdB, matchDate,
                    season, set, score, venue, firstReferee, secondReferee);
        }
    }
}
