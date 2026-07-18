package com.blockout.teams.team.api.v2;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.PageInfo;
import com.blockout.teams.generated.api.TeamsApi;
import com.blockout.teams.generated.model.CreateTeamInternalRequest;
import com.blockout.teams.generated.model.TeamInternalPageResponse;
import com.blockout.teams.generated.model.TeamInternalResponse;
import com.blockout.teams.generated.model.UpdateTeamInternalRequest;
import com.blockout.teams.team.api.TeamLogoUploads;
import com.blockout.teams.team.application.TeamFilter;
import com.blockout.teams.team.application.TeamLifecycleService;
import com.blockout.teams.team.application.TeamLogoChange;
import com.blockout.teams.team.application.TeamPage;
import com.blockout.teams.team.application.TeamService;
import com.blockout.teams.team.domain.TeamLogoUpload;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
public class TeamV2Controller implements TeamsApi {

    private final TeamService service;
    private final TeamLifecycleService lifecycleService;
    private final TeamApiMapper mapper;

    @Override
    public ResponseEntity<TeamInternalPageResponse> listTeams(
            Long divisionId,
            FormatEnum format,
            GenderEnum gender,
            String season,
            String clubId,
            List<Long> ids,
            Boolean active,
            Integer page,
            Integer pageSize) {
        TeamPage result = service.findPage(
                new TeamFilter(divisionId, format, gender, season, clubId, ids, active), page, pageSize);
        PageInfo pageInfo = new PageInfo(result.page(), result.pageSize(), result.hasNext())
                .totalItems(result.totalItems());
        return ResponseEntity.ok(new TeamInternalPageResponse(
                result.items().stream().map(mapper::toResponse).toList(), pageInfo));
    }

    @Override
    public ResponseEntity<TeamInternalResponse> getTeam(Long id) {
        return ResponseEntity.ok(mapper.toResponse(service.getById(id)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:teams')")
    public ResponseEntity<TeamInternalResponse> createTeam(CreateTeamInternalRequest request) {
        TeamInternalResponse response = mapper.toResponse(service.create(mapper.toCommand(request)));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.getId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:teams')")
    public ResponseEntity<TeamInternalResponse> updateTeam(
            Long id,
            UpdateTeamInternalRequest data,
            MultipartFile image) {
        TeamLogoUpload upload = TeamLogoUploads.from(image);
        if (Boolean.TRUE.equals(data.getRemoveLogo()) && upload != null) {
            throw new IllegalArgumentException("removeLogo cannot be true when an image is supplied.");
        }
        TeamLogoChange logoChange = upload != null
                ? TeamLogoChange.replace(upload)
                : Boolean.TRUE.equals(data.getRemoveLogo()) ? TeamLogoChange.remove() : TeamLogoChange.keep();
        return ResponseEntity.ok(mapper.toResponse(service.update(id, mapper.toCommand(data), logoChange)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:teams')")
    public ResponseEntity<Void> deactivateTeam(Long id) {
        lifecycleService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
