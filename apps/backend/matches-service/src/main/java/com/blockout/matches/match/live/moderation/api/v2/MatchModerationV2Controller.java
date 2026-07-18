package com.blockout.matches.match.live.moderation.api.v2;

import com.blockout.shared.model.MatchLiveLinkDecisionEnum;
import com.blockout.matches.generated.api.MatchModerationApi;
import com.blockout.matches.generated.model.MatchLiveModerationPageResponse;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationApplicationService;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationPage;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationQuery;
import com.blockout.matches.match.live.moderation.application.ModerateMatchLiveLinkCommand;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.PageInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MatchModerationV2Controller implements MatchModerationApi {

    private final MatchLiveModerationApplicationService service;
    private final MatchModerationApiMapper mapper;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    public ResponseEntity<MatchLiveModerationPageResponse> listMatchesForLiveModeration(
            LiveLinkStatusEnum status, Integer page, Integer pageSize) {
        MatchLiveModerationPage result = service.findPage(new MatchLiveModerationQuery(status, page, pageSize));
        PageInfo pageInfo = new PageInfo(result.page(), result.pageSize(), result.hasNext())
                .totalItems(result.totalItems());
        return ResponseEntity.ok(new MatchLiveModerationPageResponse(
                result.items().stream().map(mapper::toResponse).toList(), pageInfo));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    public ResponseEntity<Void> approveMatchLiveLink(Long liveLinkId) {
        service.moderate(new ModerateMatchLiveLinkCommand(liveLinkId, MatchLiveLinkDecisionEnum.APPROVE));
        return ResponseEntity.noContent().build();
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    public ResponseEntity<Void> rejectMatchLiveLink(Long liveLinkId) {
        service.moderate(new ModerateMatchLiveLinkCommand(liveLinkId, MatchLiveLinkDecisionEnum.REJECT));
        return ResponseEntity.noContent().build();
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_moderate:match_live_link')")
    public ResponseEntity<Void> reactivateMatchLiveLink(Long liveLinkId) {
        service.moderate(new ModerateMatchLiveLinkCommand(liveLinkId, MatchLiveLinkDecisionEnum.REACTIVATE));
        return ResponseEntity.noContent().build();
    }
}
