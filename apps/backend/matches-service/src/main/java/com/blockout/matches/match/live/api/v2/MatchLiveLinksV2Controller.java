package com.blockout.matches.match.live.api.v2;

import com.blockout.matches.generated.api.MatchLiveLinksApi;
import com.blockout.matches.generated.model.MatchLiveLinkResult;
import com.blockout.matches.generated.model.UpsertMatchLiveLinkInternalRequest;
import com.blockout.matches.match.live.application.AuthenticatedSubjectProvider;
import com.blockout.matches.match.live.application.MatchLiveLinkApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MatchLiveLinksV2Controller implements MatchLiveLinksApi {

    private final MatchLiveLinkApplicationService service;
    private final MatchLiveLinkApiMapper mapper;
    private final AuthenticatedSubjectProvider subjects;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:match_live_link')")
    public ResponseEntity<MatchLiveLinkResult> upsertMatchLiveLink(
            Long matchId, UpsertMatchLiveLinkInternalRequest request) {
        return ResponseEntity.ok(mapper.toResponse(service.upsert(matchId, mapper.toCommand(request))));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:match_live_link')")
    public ResponseEntity<Void> deleteMatchLiveLink(Long matchId) {
        service.delete(matchId, subjects.getSubject());
        return ResponseEntity.noContent().build();
    }
}
