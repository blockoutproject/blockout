package com.blockout.mobilegateway.club.api;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.club.api.models.UpdateClubRequest;
import com.blockout.mobilegateway.club.application.ClubApplicationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure")
public class ClubSecureController {

    private final ClubApplicationService clubService;
    private final ObjectMapper objectMapper;

    @PutMapping(path = "/clubs/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ClubResponse> updateClub(
            @PathVariable String id,
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        UpdateClubRequest dto = objectMapper.readValue(json, UpdateClubRequest.class);
        ClubResponse updated = clubService.updateClub(id, dto, image);
        return ResponseEntity.ok(updated);
    }
}