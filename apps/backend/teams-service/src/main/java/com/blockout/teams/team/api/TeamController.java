package com.blockout.teams.team.api;

import com.blockout.teams.team.api.mappers.TeamApiMapper;
import com.blockout.teams.team.api.models.CreateTeamInternalRequest;
import com.blockout.teams.team.api.models.TeamInternalResponse;
import com.blockout.teams.team.api.models.UpdateTeamInternalRequest;
import com.blockout.teams.team.application.TeamService;
import com.blockout.teams.team.application.views.TeamView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Implements the generated V1 internal Team API.
 */
@RestController
@RequiredArgsConstructor
public class TeamController implements TeamApi {

    private final TeamService teamService;
    private final TeamApiMapper mapper;
    private final ObjectMapper objectMapper;

    @Override
    public ResponseEntity<List<TeamInternalResponse>> listTeams(
        Long divisionId,
        com.blockout.shared.model.FormatEnum format,
        com.blockout.shared.model.GenderEnum gender,
        String season,
        String clubId,
        List<Long> ids,
        Boolean active) {
        return ResponseEntity.ok(teamService.findTeams(divisionId, mapper.toFormat(format), mapper.toGender(gender),
                season, clubId, ids, active).stream()
            .map(mapper::toInternalResponse)
            .toList());
    }

    @Override
    public ResponseEntity<TeamInternalResponse> getTeamById(Long id) {
        return ResponseEntity.ok(mapper.toInternalResponse(teamService.getTeamById(id)));
    }

    @PreAuthorize("hasAuthority('SCOPE_create:teams')")
    @Override
    public ResponseEntity<TeamInternalResponse> createTeam(CreateTeamInternalRequest request) {
        TeamView created = teamService.createTeam(mapper.toCommand(request));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(created));
    }

    @PreAuthorize("hasAuthority('SCOPE_update:teams')")
    @Override
    public ResponseEntity<TeamInternalResponse> updateTeam(Long id, String data, MultipartFile image) {
        UpdateTeamInternalRequest request = readData(data);
        return ResponseEntity.ok(mapper.toInternalResponse(teamService.updateTeam(id, mapper.toCommand(request, image))));
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:teams')")
    @Override
    public ResponseEntity<Void> deactivateTeam(Long id) {
        teamService.deactivateTeam(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<String>> getUniqueClubIds() {
        return ResponseEntity.ok(teamService.getUniqueClubIds());
    }

    @PreAuthorize("hasAuthority('SCOPE_follow:teams')")
    @Override
    public ResponseEntity<TeamInternalResponse> incrementFollowers(Long teamId, Long userId) {
        return ResponseEntity.ok(mapper.toInternalResponse(teamService.incrementFollowersCount(teamId, userId)));
    }

    @PreAuthorize("hasAuthority('SCOPE_follow:teams')")
    @Override
    public ResponseEntity<TeamInternalResponse> decrementFollowers(Long teamId, Long userId) {
        return ResponseEntity.ok(mapper.toInternalResponse(teamService.decrementFollowersCount(teamId, userId)));
    }

    private UpdateTeamInternalRequest readData(String data) {
        try {
            return objectMapper.readValue(data, UpdateTeamInternalRequest.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("The multipart data field is invalid.", exception);
        }
    }
}
