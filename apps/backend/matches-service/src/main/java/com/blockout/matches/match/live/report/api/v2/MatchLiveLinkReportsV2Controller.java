package com.blockout.matches.match.live.report.api.v2;

import com.blockout.matches.generated.api.MatchLiveLinkReportsApi;
import com.blockout.matches.generated.model.ReportMatchLiveLinkInternalRequest;
import com.blockout.matches.match.live.application.AuthenticatedSubjectProvider;
import com.blockout.matches.match.live.report.application.MatchLiveLinkReportApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MatchLiveLinkReportsV2Controller implements MatchLiveLinkReportsApi {

    private final MatchLiveLinkReportApplicationService service;
    private final MatchLiveLinkReportApiMapper mapper;
    private final AuthenticatedSubjectProvider subjects;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_report:match_live_link')")
    public ResponseEntity<Void> reportMatchLiveLink(
            Long matchId,
            ReportMatchLiveLinkInternalRequest request) {
        service.report(matchId, mapper.toCommand(request, subjects.getSubject()));
        return ResponseEntity.noContent().build();
    }
}
