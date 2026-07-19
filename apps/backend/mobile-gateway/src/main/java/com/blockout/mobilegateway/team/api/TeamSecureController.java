package com.blockout.mobilegateway.team.api;

import com.blockout.mobilegateway.team.api.models.TeamInternalResponse;
import com.blockout.mobilegateway.team.api.models.UpdateTeamRequest;
import com.blockout.mobilegateway.team.application.TeamApplicationService;
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

    private final TeamApplicationService teamService;
    private final ObjectMapper objectMapper;

    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TeamInternalResponse> updateTeam(
            @PathVariable Long id,
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image) throws JsonProcessingException {

        UpdateTeamRequest dto = objectMapper.readValue(json, UpdateTeamRequest.class);
        TeamInternalResponse updated = teamService.updateTeam(id, dto, image);
        return ResponseEntity.ok(updated);
    }
}