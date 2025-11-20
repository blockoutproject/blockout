package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamUpdateDTO;
import com.blockout.mobilegateway.services.TeamService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure/teams")
public class TeamSecureController {

    private final TeamService teamService;
    private final ObjectMapper objectMapper;

    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TeamDTO> updateTeam(
            @PathVariable Long id,
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) throws JsonProcessingException {

        TeamUpdateDTO dto = objectMapper.readValue(json, TeamUpdateDTO.class);
        TeamDTO updated = teamService.updateTeam(id, dto, image);
        return ResponseEntity.ok(updated);
    }
}