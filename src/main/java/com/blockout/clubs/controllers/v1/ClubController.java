package com.blockout.clubs.controllers.v1;

import com.blockout.clubs.models.Club;
import com.blockout.clubs.services.ClubService;
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
@RequestMapping("/api/v1/clubs")
public class ClubController {

    private final ClubService clubService;

    public ClubController(ClubService clubService) {
        this.clubService = clubService;
    }

    @Operation(summary = "List clubs", description = "Returns all clubs.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Clubs returned"),
            @ApiResponse(responseCode = "204", description = "No club found")
    })
    @GetMapping
        public ResponseEntity<List<Club>> listClubs() {
        List<Club> list = clubService.getAllClubs();
        if (list.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "Create a club")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Club created"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping
    public ResponseEntity<Club> createClub(@RequestBody Club club) {
        Club created = clubService.createClub(club);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "Update a club")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Club updated"),
            @ApiResponse(responseCode = "404", description = "Club not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<Club> updateClub(
            @PathVariable String id,
            @RequestBody Club updated) {

        Optional<Club> result = clubService.updateClub(id, updated);
        return result.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}