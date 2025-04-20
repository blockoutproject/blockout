package com.blockout.teams.controllers.v1;

import com.blockout.teams.models.Team;
import com.blockout.teams.models.TeamFormat;
import com.blockout.teams.models.TeamGender;
import com.blockout.teams.services.TeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Optional;

@RestController
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @Operation(summary = "Create a team", description = "Creates a team.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Team created"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping
    public ResponseEntity<Team> createTeam(@RequestBody Team team) {
        Team created = teamService.createTeam(team);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "List teams", description = "Returns teams. Optional filters: name, divisionName, format, gender, ids.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Teams returned"),
            @ApiResponse(responseCode = "204", description = "No team found")
    })
    @GetMapping
    public ResponseEntity<List<Team>> listTeams(
            @RequestParam(required = false) String name,
            @RequestParam(required = false, name = "division_name") String divisionName,
            @RequestParam(required = false) TeamFormat format,
            @RequestParam(required = false) TeamGender gender,
            @RequestParam(required = false) List<Long> ids) {

        List<Team> teams = teamService.findTeams(name, divisionName, format, gender, ids);

        if (teams.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(teams);
    }

    @Operation(summary = "Get team by ID", description = "Returns a team by ID.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Team found"),
            @ApiResponse(responseCode = "404", description = "Team not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Team> getTeamById(@PathVariable Long id) {
        return teamService.getTeamById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Update a team")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Team updated"),
            @ApiResponse(responseCode = "404", description = "Team not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<Team> updateTeam(
            @PathVariable Long id,
            @RequestBody Team updated) {

        Optional<Team> result = teamService.updateTeam(id, updated);
        return result.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Get unique club IDs")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Club IDs returned"),
            @ApiResponse(responseCode = "204", description = "No club ID found")
    })
    @GetMapping("/club-ids")
    public ResponseEntity<List<String>> uniqueClubIds() {
        List<String> clubIds = teamService.getUniqueClubIds();
        if (clubIds.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(clubIds);
    }
}