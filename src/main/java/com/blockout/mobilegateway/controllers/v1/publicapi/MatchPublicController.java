package com.blockout.mobilegateway.controllers.v1.publicapi;

import com.blockout.mobilegateway.models.dto.match.EnrichedDayPageDTO;
import com.blockout.mobilegateway.models.dto.match.EnrichedMatchDTO;
import com.blockout.mobilegateway.services.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public")
public class MatchPublicController {

    private final MatchService matchService;

    @GetMapping("/matches/{id}")
    public ResponseEntity<EnrichedMatchDTO> getMatchById(@PathVariable("id") Long id) {
        var match = matchService.getMatchById(id);
        return ResponseEntity.ok(match);
    }

    @GetMapping("/matches")
    public ResponseEntity<EnrichedDayPageDTO> getMatchList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "4") int size,
            @RequestParam(required = false, name = "pool_ids") List<Long> poolIds,
            @RequestParam(required = false, name = "team_ids") List<Long> teamIds,
            @RequestParam String status) {
        var matches = matchService.getMatchList(status, page, size, poolIds, teamIds);
        return ResponseEntity.ok(matches);
    }
}