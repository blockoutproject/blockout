package com.blockout.competitions.ranking.api.v2;

import com.blockout.competitions.generated.api.CompetitionRankingsApi;
import com.blockout.competitions.generated.model.PoolRankingInternalPageResponse;
import com.blockout.competitions.ranking.application.CompetitionRankingService;
import com.blockout.competitions.ranking.application.PoolRankingPage;
import com.blockout.shared.model.PageInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class CompetitionRankingsV2Controller implements CompetitionRankingsApi {

    private final CompetitionRankingService service;
    private final CompetitionRankingApiMapper mapper;

    @Override
    public ResponseEntity<PoolRankingInternalPageResponse> listPoolRankingsByTeam(
            Long teamId, Integer page, Integer pageSize) {
        PoolRankingPage result = service.findPageByTeam(teamId, page, pageSize);
        PageInfo pageInfo = new PageInfo(result.page(), result.pageSize(), result.hasNext())
                .totalItems(result.totalItems());
        return ResponseEntity.ok(new PoolRankingInternalPageResponse(
                result.items().stream().map(mapper::toResponse).toList(), pageInfo));
    }
}
