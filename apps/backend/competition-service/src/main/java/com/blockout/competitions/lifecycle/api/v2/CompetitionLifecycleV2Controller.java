package com.blockout.competitions.lifecycle.api.v2;

import com.blockout.competitions.generated.api.CompetitionLifecycleApi;
import com.blockout.competitions.generated.model.MissingClubIdsInternalRequest;
import com.blockout.competitions.generated.model.MissingPoolIdsInternalRequest;
import com.blockout.competitions.generated.model.MissingTeamIdsInternalRequest;
import com.blockout.competitions.lifecycle.application.CompetitionLifecycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class CompetitionLifecycleV2Controller implements CompetitionLifecycleApi {

    private final CompetitionLifecycleService service;
    private final CompetitionLifecycleApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    public ResponseEntity<Void> bulkDeactivateCompetitionTeamsByPool(
            Long poolId, MissingTeamIdsInternalRequest request) {
        service.bulkDeactivateTeamsByPool(mapper.toCommand(poolId, request));
        return ResponseEntity.noContent().build();
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    public ResponseEntity<Void> bulkDeactivateCompetitionPools(MissingPoolIdsInternalRequest request) {
        service.bulkDeactivatePools(mapper.toCommand(request));
        return ResponseEntity.noContent().build();
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:competitions')")
    public ResponseEntity<Void> bulkDeactivateCompetitionClubs(MissingClubIdsInternalRequest request) {
        service.bulkDeactivateClubs(mapper.toCommand(request));
        return ResponseEntity.noContent().build();
    }
}
