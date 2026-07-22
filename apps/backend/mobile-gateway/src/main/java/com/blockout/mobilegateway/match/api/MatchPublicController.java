package com.blockout.mobilegateway.match.api;

import com.blockout.mobilegateway.match.api.mappers.MatchApiMapper;
import com.blockout.mobilegateway.api.MatchPublicApi;
import com.blockout.mobilegateway.api.models.DayPageResponse;
import com.blockout.mobilegateway.api.models.MatchResponse;
import com.blockout.mobilegateway.match.application.MatchApplicationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MatchPublicController implements MatchPublicApi {

    private final MatchApplicationService matchService;
    private final MatchApiMapper mapper;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<MatchResponse> getMatchById(Long id) {
        return ResponseEntity.ok(mapper.toResponse(matchService.getMatchById(id)));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<DayPageResponse> getMatchList(
            String status, Integer page, Integer size, List<Long> poolIds, List<Long> teamIds) {
        return ResponseEntity.ok(
            mapper.toResponse(matchService.getMatchList(status, page, size, poolIds, teamIds)));
    }
}
