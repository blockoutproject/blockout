package com.blockout.competitions.association.api.v2;

import com.blockout.competitions.association.application.AddCompetitionAssociationCommand;
import com.blockout.competitions.association.application.CompetitionAssociationPage;
import com.blockout.competitions.association.application.CompetitionAssociationService;
import com.blockout.competitions.generated.api.CompetitionAssociationsApi;
import com.blockout.competitions.generated.model.CompetitionAssociationInternalPageResponse;
import com.blockout.competitions.generated.model.CompetitionAssociationInternalResponse;
import com.blockout.shared.model.PageInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class CompetitionAssociationsV2Controller implements CompetitionAssociationsApi {

    private final CompetitionAssociationService service;
    private final CompetitionAssociationApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:competitions') and hasAuthority('SCOPE_update:competitions')")
    public ResponseEntity<CompetitionAssociationInternalResponse> addOrReactivateCompetitionAssociation(
            Long poolId, Long teamId, String clubId) {
        return ResponseEntity.ok(mapper.toResponse(
                service.addOrReactivate(new AddCompetitionAssociationCommand(poolId, teamId, clubId))));
    }

    @Override
    public ResponseEntity<CompetitionAssociationInternalPageResponse> listCompetitionAssociationsByPool(
            Long poolId, Integer page, Integer pageSize) {
        return ResponseEntity.ok(response(service.findPageByPool(poolId, page, pageSize)));
    }

    @Override
    public ResponseEntity<CompetitionAssociationInternalPageResponse> listCompetitionAssociationsByTeam(
            Long teamId, Integer page, Integer pageSize) {
        return ResponseEntity.ok(response(service.findPageByTeam(teamId, page, pageSize)));
    }

    private CompetitionAssociationInternalPageResponse response(CompetitionAssociationPage page) {
        PageInfo pageInfo = new PageInfo(page.page(), page.pageSize(), page.hasNext()).totalItems(page.totalItems());
        return new CompetitionAssociationInternalPageResponse(
                page.items().stream().map(mapper::toResponse).toList(), pageInfo);
    }
}
