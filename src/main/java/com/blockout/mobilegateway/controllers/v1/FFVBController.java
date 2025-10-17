package com.blockout.mobilegateway.controllers.v1;

import com.blockout.mobilegateway.services.ffvb.FFVBOrchestratorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/ffvb")
@Tag(name = "FFVB PDF Proxy (by matchId)")
public class FFVBController {

    private final FFVBOrchestratorService orchestrator;

    @Operation(summary = "Feuille de match (PDF) – par matchId")
    @GetMapping("/matches/{matchId}/sheet.pdf")
    public ResponseEntity<byte[]> getMatchSheetPdf(@PathVariable Long matchId) {
        var res = orchestrator.fetchMatchSheetPdf(matchId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"feuille-match-" + res.codmatch() + "-" + res.codent() + ".pdf\"")
                .cacheControl(CacheControl.noStore())
                .body(res.pdf());
    }

    @Operation(summary = "Fiche adresse (PDF) – par matchId (multipart)")
    @GetMapping("/matches/{matchId}/address.pdf")
    public ResponseEntity<byte[]> getMatchAddressPdf(@PathVariable Long matchId) {
        var res = orchestrator.fetchMatchAddressPdf(matchId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"fiche-adresse-" + res.codmatch() + "-" + res.codent() + ".pdf\"")
                .cacheControl(CacheControl.noStore())
                .body(res.pdf());
    }
}