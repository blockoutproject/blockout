package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.club.ClubUpdateDTO;
import com.blockout.mobilegateway.services.ClubService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure")
public class ClubSecureController {

    private final ClubService clubService;

    @PutMapping(path = "/clubs", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ClubDTO> updateClub(
            @RequestPart("data") ClubUpdateDTO data,
            @RequestPart(value = "image", required = false) MultipartFile image) {

        var updated = clubService.updateClub(data, image);
        return ResponseEntity.ok(updated);
    }
}