package com.blockout.clubs.club.api.v2;

import com.blockout.clubs.club.api.ClubLogoUploads;
import com.blockout.clubs.club.application.ClubLogoChange;
import com.blockout.clubs.club.application.ClubLogoUpload;
import com.blockout.clubs.club.application.ClubPage;
import com.blockout.clubs.club.application.ClubService;
import com.blockout.clubs.generated.api.ClubsApi;
import com.blockout.clubs.generated.model.ClubInternalPageResponse;
import com.blockout.clubs.generated.model.ClubInternalResponse;
import com.blockout.clubs.generated.model.CreateClubInternalRequest;
import com.blockout.clubs.generated.model.UpdateClubInternalRequest;
import com.blockout.shared.model.PageInfo;
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
public class ClubV2Controller implements ClubsApi {

    private final ClubService service;
    private final ClubApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:clubs')")
    public ResponseEntity<ClubInternalPageResponse> listClubs(
            List<String> ids,
            Boolean active,
            Integer page,
            Integer pageSize) {
        ClubPage result = service.findPage(ids, active, page, pageSize);
        PageInfo pageInfo = new PageInfo(result.page(), result.pageSize(), result.hasNext())
                .totalItems(result.totalItems());
        return ResponseEntity.ok(new ClubInternalPageResponse(
                result.items().stream().map(mapper::toResponse).toList(), pageInfo));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_read:clubs')")
    public ResponseEntity<ClubInternalResponse> getClub(String id) {
        return ResponseEntity.ok(mapper.toResponse(service.getById(id)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:clubs')")
    public ResponseEntity<ClubInternalResponse> createClub(
            CreateClubInternalRequest data,
            MultipartFile image) {
        ClubInternalResponse response = mapper.toResponse(
                service.create(mapper.toCommand(data), ClubLogoUploads.from(image)));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.getId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:clubs')")
    public ResponseEntity<ClubInternalResponse> updateClub(
            String id,
            UpdateClubInternalRequest data,
            MultipartFile image) {
        ClubLogoUpload upload = ClubLogoUploads.from(image);
        if (Boolean.TRUE.equals(data.getRemoveLogo()) && upload != null) {
            throw new IllegalArgumentException("removeLogo cannot be true when an image is supplied.");
        }
        ClubLogoChange logoChange = upload != null
                ? ClubLogoChange.replace(upload)
                : Boolean.TRUE.equals(data.getRemoveLogo()) ? ClubLogoChange.remove() : ClubLogoChange.keep();
        return ResponseEntity.ok(mapper.toResponse(service.update(id, mapper.toCommand(data), logoChange)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:clubs')")
    public ResponseEntity<Void> deactivateClub(String id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
