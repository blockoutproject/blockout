package com.blockout.matches.match.api.v2;

import com.blockout.matches.generated.api.MatchDaysApi;
import com.blockout.matches.generated.model.MatchDayPageResponse;
import com.blockout.matches.match.application.MatchApplicationService;
import com.blockout.matches.match.application.MatchDayPage;
import com.blockout.matches.match.application.MatchDayQuery;
import com.blockout.shared.model.MatchStatusEnum;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MatchDaysV2Controller implements MatchDaysApi {

    private final MatchApplicationService service;
    private final MatchApiMapper mapper;

    @Override
    public ResponseEntity<MatchDayPageResponse> listMatchDayGroups(
            Integer page,
            Integer pageSize,
            List<Long> poolIds,
            List<Long> teamIds,
            MatchStatusEnum status,
            Boolean active) {
        MatchDayPage result = service.findDayPage(
                new MatchDayQuery(poolIds, teamIds, status, page, pageSize, active));
        return ResponseEntity.ok(new MatchDayPageResponse(
                result.dayMatches().stream().map(mapper::toResponse).toList(),
                result.hasNext(), result.nextPage()));
    }
}
