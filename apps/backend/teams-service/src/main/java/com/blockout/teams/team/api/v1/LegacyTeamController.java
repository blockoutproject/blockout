package com.blockout.teams.team.api.v1;

import com.blockout.shared.model.FollowerCountDeltaEnum;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.teams.shared.api.v1.LegacyTeamsJson;
import com.blockout.teams.team.application.LegacyCreateTeamCommand;
import com.blockout.teams.team.application.TeamFilter;
import com.blockout.teams.team.application.TeamFollowerCommand;
import com.blockout.teams.team.application.TeamFollowerProjectionService;
import com.blockout.teams.team.application.TeamLifecycleService;
import com.blockout.teams.team.application.TeamService;
import com.blockout.teams.team.application.TeamView;
import com.blockout.teams.team.application.UpdateTeamCommand;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/teams", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyTeamController {

    private final TeamService service;
    private final TeamLifecycleService lifecycleService;
    private final TeamFollowerProjectionService followerProjectionService;
    private final LegacyTeamsJson json;

    @GetMapping
    public ResponseEntity<String> listTeams(
            @RequestParam(name = "division_id", required = false) Long divisionId,
            @RequestParam(required = false) FormatEnum format,
            @RequestParam(required = false) GenderEnum gender,
            @RequestParam(required = false) String season,
            @RequestParam(name = "club_id", required = false) String clubId,
            @RequestParam(required = false) List<Long> ids,
            @RequestParam(required = false) Boolean active) throws JsonProcessingException {
        List<LegacyTeamResponse> response = service.findLegacy(
                        new TeamFilter(divisionId, format, gender, season, clubId, ids, active))
                .stream().map(this::response).toList();
        return ResponseEntity.ok(json.write(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> getTeam(@PathVariable Long id) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(response(service.getById(id))));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_create:teams')")
    public ResponseEntity<String> createTeam(@RequestBody String body) throws JsonProcessingException {
        JsonNode node = json.readTree(body);
        LegacyTeamRequest request = json.convert(node, LegacyTeamRequest.class);
        Long followersCount = node.has("followers_count") ? request.followersCount() : 0L;
        Boolean active = node.has("active") ? request.active() : true;
        TeamView saved = service.createLegacy(new LegacyCreateTeamCommand(
                request.id(), request.clubId(), request.rawName(), request.name(), request.shortName(),
                request.leagueCode(), request.divisionId(), request.season(), request.format(), request.gender(),
                followersCount, request.logoUrl(), active, request.createdAt(), request.lastUpdate()));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(saved.id()).toUri();
        return ResponseEntity.created(location).body(json.write(response(saved)));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('SCOPE_update:teams')")
    public ResponseEntity<String> updateTeam(
            @PathVariable Long id,
            @RequestPart("data") String body,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {
        LegacyTeamRequest request = json.read(body, LegacyTeamRequest.class);
        TeamView updated = service.update(id, new UpdateTeamCommand(
                request.clubId(), request.rawName(), request.name(), request.shortName(), request.leagueCode(),
                request.divisionId(), request.season(), request.format(), request.gender(), request.active()),
                LegacyTeamLogoChanges.from(request.logoUrl(), image));
        return ResponseEntity.ok(json.write(response(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_delete:teams')")
    public ResponseEntity<Void> deactivateTeam(@PathVariable Long id) {
        lifecycleService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/club-ids")
    public ResponseEntity<String> listClubIds() throws JsonProcessingException {
        return ResponseEntity.ok(json.write(service.findClubIdsLegacy()));
    }

    @PostMapping("/{teamId}/followers/increment")
    @PreAuthorize("hasAuthority('SCOPE_follow:teams')")
    public ResponseEntity<String> incrementFollowers(
            @PathVariable Long teamId,
            @RequestParam(name = "user_id") Long userId) throws JsonProcessingException {
        return followerResponse(teamId, userId, FollowerCountDeltaEnum.INCREMENT);
    }

    @PostMapping("/{teamId}/followers/decrement")
    @PreAuthorize("hasAuthority('SCOPE_follow:teams')")
    public ResponseEntity<String> decrementFollowers(
            @PathVariable Long teamId,
            @RequestParam(name = "user_id") Long userId) throws JsonProcessingException {
        return followerResponse(teamId, userId, FollowerCountDeltaEnum.DECREMENT);
    }

    private ResponseEntity<String> followerResponse(Long teamId, Long userId, FollowerCountDeltaEnum delta)
            throws JsonProcessingException {
        TeamView updated = followerProjectionService.updateFollowers(new TeamFollowerCommand(teamId, userId, delta));
        return ResponseEntity.ok(json.write(response(updated)));
    }

    private LegacyTeamResponse response(TeamView view) {
        return new LegacyTeamResponse(view.id(), view.clubId(), view.rawName(), view.name(), view.shortName(),
                view.leagueCode(), view.divisionId(), view.season(), view.format(), view.gender(),
                view.followersCount(), view.logoUrl(), view.active(), view.createdAt(), view.lastUpdate());
    }

    record LegacyTeamRequest(
            Long id,
            String clubId,
            String rawName,
            String name,
            String shortName,
            String leagueCode,
            Long divisionId,
            String season,
            FormatEnum format,
            GenderEnum gender,
            Long followersCount,
            String logoUrl,
            Boolean active,
            LocalDateTime createdAt,
            LocalDateTime lastUpdate) {
    }

    record LegacyTeamResponse(
            Long id,
            String clubId,
            String rawName,
            String name,
            String shortName,
            String leagueCode,
            Long divisionId,
            String season,
            FormatEnum format,
            GenderEnum gender,
            Long followersCount,
            String logoUrl,
            Boolean active,
            LocalDateTime createdAt,
            LocalDateTime lastUpdate) {
    }
}
