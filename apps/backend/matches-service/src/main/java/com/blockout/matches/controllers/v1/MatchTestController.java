package com.blockout.matches.controllers.v1;

import com.blockout.matches.match.application.MatchFinishedEventInput;
import com.blockout.matches.match.application.MatchApplicationService;
import com.blockout.matches.match.application.MatchSnapshot;
import com.blockout.matches.models.events.MatchFinishedEvent;
import com.blockout.matches.services.EventPublisher;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/matches/internal/test")
@Tag(name = "Matches Test", description = "Endpoints de test pour émettre des événements RabbitMQ")
public class MatchTestController {

    private static final Logger logger = LoggerFactory.getLogger(MatchTestController.class);

    private final MatchApplicationService matches;
    private final EventPublisher eventPublisher;

    @Operation(summary = "Émettre un event match.finished par ID", description = "Charge le match et publie un event match.finished, sans modifier le statut en base.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Event publié"),
            @ApiResponse(responseCode = "404", description = "Match introuvable")
    })
    @PreAuthorize("hasAuthority('SCOPE_publish:events')")
    @PostMapping("/{id}/emit-finished")
    public ResponseEntity<Void> emitFinishedById(@PathVariable Long id) {
        MatchSnapshot match = matches.findById(id);

        eventPublisher.publishMatchFinished(new MatchFinishedEventInput(
                match.id(), match.teamIdA(), match.teamIdB(), match.poolId(), match.set()));

        logger.info("Test event match.finished emitted",
                keyValue("action", "emit_test_match_finished"),
                keyValue("matchId", match.id()),
                keyValue("teamIdA", match.teamIdA()),
                keyValue("teamIdB", match.teamIdB()),
                keyValue("poolId", match.poolId()));

        return ResponseEntity.accepted().build();
    }

    @Operation(summary = "Émettre un event match.finished custom", description = "Publie un event match.finished avec un payload fourni (pour tests d’intégration).")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Event publié")
    })
    @PreAuthorize("hasAuthority('SCOPE_publish:events')")
    @PostMapping("/emit-finished")
    public ResponseEntity<Void> emitFinishedCustom(@RequestBody MatchFinishedEvent event) {

        eventPublisher.publishMatchFinished(new MatchFinishedEventInput(
                event.getId(), event.getTeamIdA(), event.getTeamIdB(), event.getPoolId(), event.getSet()));

        logger.info("Custom test event match.finished emitted",
                keyValue("action", "emit_test_match_finished_custom"),
                keyValue("matchId", event.getId()),
                keyValue("teamIdA", event.getTeamIdA()),
                keyValue("teamIdB", event.getTeamIdB()),
                keyValue("poolId", event.getPoolId()));

        return ResponseEntity.accepted().build();
    }
}
