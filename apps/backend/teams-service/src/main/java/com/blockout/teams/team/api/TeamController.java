package com.blockout.teams.team.api;

import com.blockout.teams.team.api.mappers.TeamApiMapper;
import com.blockout.teams.team.api.models.CreateTeamInternalRequest;
import com.blockout.teams.team.api.models.TeamInternalResponse;
import com.blockout.teams.team.api.models.UpdateTeamInternalRequest;
import com.blockout.teams.team.application.TeamService;
import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;
import com.blockout.teams.team.application.views.TeamView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.List;

/**
 * Exposes the handwritten V1 internal Team API.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teams")
public class TeamController {

    private final TeamService teamService;
    private final TeamApiMapper mapper;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<List<TeamInternalResponse>> listTeams(
        @RequestParam(required = false) Long divisionId,
        @RequestParam(required = false) Format format,
        @RequestParam(required = false) Gender gender,
        @RequestParam(required = false) String season,
        @RequestParam(required = false) String clubId,
        @RequestParam(required = false) List<Long> ids,
        @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(teamService.findTeams(divisionId, format, gender, season, clubId, ids, active).stream()
            .map(mapper::toInternalResponse)
            .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeamInternalResponse> getTeamById(@PathVariable Long id) {
        return ResponseEntity.ok(mapper.toInternalResponse(teamService.getTeamById(id)));
    }

    @PreAuthorize("hasAuthority('SCOPE_create:teams')")
    @PostMapping
    public ResponseEntity<TeamInternalResponse> createTeam(@RequestBody CreateTeamInternalRequest request) {
        TeamView created = teamService.createTeam(mapper.toCommand(request));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(created));
    }

    @PreAuthorize("hasAuthority('SCOPE_update:teams')")
    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TeamInternalResponse> updateTeam(
        @PathVariable Long id,
        @RequestPart("data") String json,
        @RequestPart(value = "image", required = false) MultipartFile image)
        throws JsonProcessingException, IOException {
        UpdateTeamInternalRequest request = objectMapper.readValue(json, UpdateTeamInternalRequest.class);
        return ResponseEntity.ok(mapper.toInternalResponse(teamService.updateTeam(id, mapper.toCommand(request, image))));
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:teams')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateTeam(@PathVariable Long id) {
        teamService.deactivateTeam(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/club-ids")
    public ResponseEntity<List<String>> getUniqueClubIds() {
        return ResponseEntity.ok(teamService.getUniqueClubIds());
    }

    @PreAuthorize("hasAuthority('SCOPE_follow:teams')")
    @PostMapping("/{teamId}/followers/increment")
    public ResponseEntity<TeamInternalResponse> incrementFollowers(
        @PathVariable Long teamId, @RequestParam Long userId) {
        return ResponseEntity.ok(mapper.toInternalResponse(teamService.incrementFollowersCount(teamId, userId)));
    }

    @PreAuthorize("hasAuthority('SCOPE_follow:teams')")
    @PostMapping("/{teamId}/followers/decrement")
    public ResponseEntity<TeamInternalResponse> decrementFollowers(
        @PathVariable Long teamId, @RequestParam Long userId) {
        return ResponseEntity.ok(mapper.toInternalResponse(teamService.decrementFollowersCount(teamId, userId)));
    }
}
