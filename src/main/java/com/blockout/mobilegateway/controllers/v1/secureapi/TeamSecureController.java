package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.team.TeamUpdateDTO;
import com.blockout.mobilegateway.services.TeamService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure/teams")
public class TeamSecureController {

    private final TeamService teamService;

    @PutMapping("/{id}")
    public ResponseEntity<TeamDTO> updateTeam(
            @PathVariable Long id,
            @RequestBody TeamUpdateDTO dto) {

        TeamDTO updated = teamService.updateTeam(id, dto);
        return ResponseEntity.ok(updated);
    }
}