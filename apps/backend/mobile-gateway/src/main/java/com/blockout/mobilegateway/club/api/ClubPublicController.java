package com.blockout.mobilegateway.club.api;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.club.application.ClubApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/clubs")
public class ClubPublicController {

    private final ClubApplicationService clubService;

    @GetMapping("/{id}")
    public ResponseEntity<ClubResponse> getClubById(@PathVariable("id") String id) {
        var club = clubService.getClubById(id);
        return ResponseEntity.ok(club);
    }
}
