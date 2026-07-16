package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.club.ClubUpdateDTO;
import com.blockout.mobilegateway.services.ClubService;
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

    private final ClubService clubService;
    private final ObjectMapper objectMapper;

    @PutMapping(path = "/clubs/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ClubDTO> updateClub(
            @PathVariable String id,
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        ClubUpdateDTO dto = objectMapper.readValue(json, ClubUpdateDTO.class);
        ClubDTO updated = clubService.updateClub(id, dto, image);
        return ResponseEntity.ok(updated);
    }
}