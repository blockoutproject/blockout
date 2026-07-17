package com.blockout.clubs.club.api.v2;

import com.blockout.clubs.club.application.ClubService;
import com.blockout.clubs.club.application.ClubView;
import com.blockout.clubs.generated.api.ClubLogosApi;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ClubLogoV2Controller implements ClubLogosApi {

    private final ClubService service;

    @Override
    public ResponseEntity<String> getClubLogo(String id) {
        ClubView club = service.getById(id);
        if (club.logoUrl() == null || club.logoUrl().isBlank()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(club.logoUrl());
    }
}
