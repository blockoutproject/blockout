package com.blockout.matches.match.live.api.v2;

import com.blockout.matches.generated.api.MatchLiveLinkHistoryApi;
import com.blockout.matches.generated.model.MatchLiveLinkHistoryPageResponse;
import com.blockout.matches.match.live.application.MatchLiveLinkHistoryPage;
import com.blockout.matches.match.live.application.MatchLiveLinkHistoryService;
import com.blockout.shared.model.PageInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MatchLiveLinkHistoryV2Controller implements MatchLiveLinkHistoryApi {

    private final MatchLiveLinkHistoryService service;
    private final MatchLiveLinkApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    public ResponseEntity<MatchLiveLinkHistoryPageResponse> listMatchLiveLinkHistory(
            Long matchId, Integer page, Integer pageSize) {
        MatchLiveLinkHistoryPage result = service.findHistory(matchId, page, pageSize);
        PageInfo pageInfo = new PageInfo(result.page(), result.pageSize(), result.hasNext())
                .totalItems(result.totalItems());
        return ResponseEntity.ok(new MatchLiveLinkHistoryPageResponse(
                result.items().stream().map(mapper::toResponse).toList(), pageInfo));
    }
}
