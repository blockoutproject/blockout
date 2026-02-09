package com.blockout.config.controllers.v1;

import com.blockout.config.models.dto.AppStatusDTO;
import com.blockout.config.models.dto.AppStatusUpdateDTO;
import com.blockout.config.services.AppStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/config/app-status")
public class AppStatusController {

    private final AppStatusService service;

    @Operation(summary = "Récupère l’état global de l’application", description = "Permet au client mobile de savoir si l’application est en maintenance et d’afficher un écran dédié.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "État récupéré avec succès")
    })
    @GetMapping
    public ResponseEntity<AppStatusDTO> getStatus() {
        AppStatusDTO status = service.getStatus();
        return ResponseEntity.ok(status);
    }

    @Operation(summary = "Met à jour l’état global de l’application (maintenance)", description = "Permet à un administrateur d’activer/désactiver le mode maintenance et de définir le message affiché aux utilisateurs.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "État mis à jour"),
    })
    @PutMapping
    //TODOZ @PreAuthorize("hasAuthority('SCOPE_update:maintenance')")
    public ResponseEntity<AppStatusDTO> updateStatus(@RequestBody AppStatusUpdateDTO dto) {
        AppStatusDTO updated = service.updateStatus(dto);
        return ResponseEntity.ok(updated);
    }
}