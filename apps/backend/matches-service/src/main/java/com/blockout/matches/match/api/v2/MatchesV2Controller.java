package com.blockout.matches.match.api.v2;

import com.blockout.matches.generated.api.MatchesApi;
import com.blockout.matches.generated.model.CreateMatchInternalRequest;
import com.blockout.matches.generated.model.MatchDetailInternalResponse;
import com.blockout.matches.generated.model.MatchInternalPageResponse;
import com.blockout.matches.generated.model.MatchInternalResponse;
import com.blockout.matches.generated.model.MissingMatchCodesInternalRequest;
import com.blockout.matches.generated.model.UpdateMatchInternalRequest;
import com.blockout.matches.match.application.DeactivateMatchesCommand;
import com.blockout.matches.match.application.MatchApplicationService;
import com.blockout.matches.match.application.MatchPage;
import com.blockout.matches.match.application.MatchQuery;
import com.blockout.shared.model.MatchStatusEnum;
import com.blockout.shared.model.PageInfo;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
public class MatchesV2Controller implements MatchesApi {

    private final MatchApplicationService service;
    private final MatchApiMapper mapper;

    @Override
    public ResponseEntity<MatchInternalPageResponse> listMatches(
            Long poolId,
            List<Long> teamIds,
            MatchStatusEnum status,
            Boolean active,
            Integer page,
            Integer pageSize) {
        MatchPage result = service.findPage(new MatchQuery(poolId, teamIds, status, active), page, pageSize);
        PageInfo pageInfo = new PageInfo(result.page(), result.pageSize(), result.hasNext())
                .totalItems(result.totalItems());
        return ResponseEntity.ok(new MatchInternalPageResponse(
                result.items().stream().map(mapper::toResponse).toList(), pageInfo));
    }

    @Override
    public ResponseEntity<MatchDetailInternalResponse> getMatch(Long id) {
        return ResponseEntity.ok(mapper.toResponse(service.findDetail(id)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:matches')")
    public ResponseEntity<MatchInternalResponse> createMatch(CreateMatchInternalRequest request) {
        MatchInternalResponse created = mapper.toResponse(service.create(mapper.toCommand(request)));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:matches')")
    public ResponseEntity<MatchInternalResponse> updateMatch(Long id, UpdateMatchInternalRequest request) {
        return ResponseEntity.ok(mapper.toResponse(service.update(id, mapper.toCommand(request))));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:matches')")
    public ResponseEntity<Void> bulkDeactivateMatchesByPool(
            Long poolId, MissingMatchCodesInternalRequest request) {
        service.deactivate(DeactivateMatchesCommand.from(poolId, request.getMissingMatchCodes()));
        return ResponseEntity.noContent().build();
    }
}
