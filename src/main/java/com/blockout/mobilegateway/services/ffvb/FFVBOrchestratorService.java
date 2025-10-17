package com.blockout.mobilegateway.services.ffvb;

import com.blockout.mobilegateway.services.clients.FFVBClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Orchestration:
 *  - Résout (saison, codent, codmatch) à partir de matchId
 *  - Appelle FFVBClientService (HTTP) pour récupérer le PDF
 *  - Retourne PDF + métadonnées utiles (codmatch/codent) pour le filename
 */
@Service
@RequiredArgsConstructor
public class FFVBOrchestratorService {

    private final FFVBParamsResolver paramsResolver;
    private final FFVBClientService ffvbClient;

    public FfvbPdfResult fetchMatchSheetPdf(Long matchId) {
        var p = paramsResolver.resolve(matchId);
        byte[] pdf = ffvbClient.fetchMatchSheetPdf(p.saison(), p.codent(), p.codmatch());
        return new FfvbPdfResult(pdf, p.codent(), p.codmatch());
    }

    public FfvbPdfResult fetchMatchAddressPdf(Long matchId) {
        var p = paramsResolver.resolve(matchId);
        byte[] pdf = ffvbClient.fetchMatchAddressPdf(p.saison(), p.codent(), p.codmatch());
        return new FfvbPdfResult(pdf, p.codent(), p.codmatch());
    }

    /** Petit record pour remonter le PDF + infos pour nommer le fichier. */
    public record FfvbPdfResult(byte[] pdf, String codent, String codmatch) {}
}