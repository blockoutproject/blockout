package com.blockout.teams.controllers.v1;

import com.blockout.teams.models.dto.TeamUpdateDTO;
import com.blockout.teams.models.entities.Team;
import com.blockout.teams.models.enums.Format;
import com.blockout.teams.models.enums.Gender;
import com.blockout.teams.services.TeamService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teams")
public class TeamController {

    private final TeamService teamService;
    private final ObjectMapper objectMapper;

    @Operation(summary = "Lister les équipes", description = "Renvoie toutes les équipes avec filtres facultatifs.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste des équipes")
    })
    @GetMapping
    public ResponseEntity<List<Team>> listTeams(
            @RequestParam(required = false, name = "division_id") Long divisionId,
            @RequestParam(required = false) Format format,
            @RequestParam(required = false) Gender gender,
            @RequestParam(required = false) String season,
            @RequestParam(required = false, name = "club_id") String clubId,
            @RequestParam(required = false) List<Long> ids,
            @RequestParam(required = false) Boolean active
    ) {
        List<Team> teams = teamService.findTeams(divisionId, format, gender, season, clubId, ids, active);
        return ResponseEntity.ok(teams);
    }

    @Operation(summary = "Récupérer une équipe", description = "Renvoie une équipe par son ID.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Équipe trouvée"),
            @ApiResponse(responseCode = "404", description = "Équipe introuvable")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Team> getTeamById(@PathVariable Long id) {
        Team team = teamService.getTeamById(id);
        return ResponseEntity.ok(team);
    }

    @Operation(summary = "Créer une équipe", description = "Crée une nouvelle équipe.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Équipe créée"),
            @ApiResponse(responseCode = "400", description = "Requête invalide")
    })
    @PreAuthorize("hasAuthority('SCOPE_create:teams')")
    @PostMapping
    public ResponseEntity<Team> createTeam(@RequestBody Team team) {
        Team created = teamService.createTeam(team);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "Mettre à jour une équipe", description = "Met à jour une équipe existante.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Équipe mise à jour"),
            @ApiResponse(responseCode = "404", description = "Équipe introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_update:teams')")
    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Team> updateTeam(
            @PathVariable Long id,
            @RequestPart("data") String json,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) throws JsonProcessingException {
        System.out.println(json);
        TeamUpdateDTO dto = objectMapper.readValue(json, TeamUpdateDTO.class);
        Team result = teamService.updateTeam(id, dto, image);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Désactiver une équipe", description = "Désactive une équipe (soft delete).")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Équipe désactivée"),
            @ApiResponse(responseCode = "404", description = "Équipe introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_delete:teams')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateTeam(@PathVariable Long id) {
        teamService.deactivateTeam(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Lister les clubs uniques", description = "Renvoie les identifiants de clubs distincts.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Liste des clubs"),
            @ApiResponse(responseCode = "204", description = "Aucun club trouvé")
    })
    @GetMapping("/club-ids")
    public ResponseEntity<List<String>> getUniqueClubIds() {
        List<String> clubs = teamService.getUniqueClubIds();
        return ResponseEntity.ok(clubs);
    }

    @Operation(summary = "Incrémenter les followers", description = "Incrémente le compteur de followers d'une équipe.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Compteur incrémenté"),
            @ApiResponse(responseCode = "404", description = "Équipe introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_follow:teams')")
    @PostMapping("/{teamId}/followers/increment")
    public ResponseEntity<Team> incrementFollowers(
            @PathVariable Long teamId,
            @RequestParam(name = "user_id") Long userId
    ) {
        Team updated = teamService.incrementFollowersCount(teamId, userId);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Décrémenter les followers", description = "Décrémente le compteur de followers d'une équipe.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Compteur décrémenté"),
            @ApiResponse(responseCode = "404", description = "Équipe introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_follow:teams')")
    @PostMapping("/{teamId}/followers/decrement")
    public ResponseEntity<Team> decrementFollowers(
            @PathVariable Long teamId,
            @RequestParam(name = "user_id") Long userId
    ) {
        Team updated = teamService.decrementFollowersCount(teamId, userId);
        return ResponseEntity.ok(updated);
    }
}