package com.blockout.mobilegateway.match.api;

import com.blockout.mobilegateway.match.api.models.DayPageResponse;
import com.blockout.mobilegateway.match.api.models.MatchResponse;
import com.blockout.mobilegateway.match.application.MatchApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/matches")
public class MatchPublicController {

    private final MatchApplicationService matchService;

    @GetMapping("/{id}")
    public ResponseEntity<MatchResponse> getMatchById(@PathVariable("id") Long id) {
        var match = matchService.getMatchById(id);
        return ResponseEntity.ok(match);
    }

    @GetMapping
    public ResponseEntity<DayPageResponse> getMatchList(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "4") int size,
        @RequestParam(required = false, name = "poolIds") List<Long> poolIds,
        @RequestParam(required = false, name = "teamIds") List<Long> teamIds,
        @RequestParam String status) {
        var matches = matchService.getMatchList(status, page, size, poolIds, teamIds);
        return ResponseEntity.ok(matches);
    }
}
