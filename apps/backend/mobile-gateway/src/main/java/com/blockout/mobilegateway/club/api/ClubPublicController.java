package com.blockout.mobilegateway.club.api;

import com.blockout.mobilegateway.api.ClubPublicApi;
import com.blockout.mobilegateway.api.models.ClubResponse;
import com.blockout.mobilegateway.club.application.ClubApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Exposes public Club operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class ClubPublicController implements ClubPublicApi {

    private final ClubApplicationService clubService;
    private final ClubApiMapper mapper;

    @Override
    public ResponseEntity<ClubResponse> getClubById(String id) {
        return ResponseEntity.ok(mapper.toResponse(clubService.getClubById(id)));
    }
}
