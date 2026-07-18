package com.blockout.competitions.association.api.v2;

import com.blockout.competitions.association.application.CompetitionStatisticsService;
import com.blockout.competitions.generated.api.CompetitionStatisticsApi;
import com.blockout.competitions.generated.model.CompetitionAssociationInternalResponse;
import com.blockout.competitions.generated.model.CompetitionStatisticsSnapshotInternalRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class CompetitionStatisticsV2Controller implements CompetitionStatisticsApi {

    private final CompetitionStatisticsService service;
    private final CompetitionAssociationApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:competitions')")
    public ResponseEntity<CompetitionAssociationInternalResponse> replaceCompetitionStatistics(
            Long poolId, Long teamId, CompetitionStatisticsSnapshotInternalRequest request) {
        return ResponseEntity.ok(mapper.toResponse(service.replace(poolId, teamId, mapper.toSnapshot(request))));
    }
}
