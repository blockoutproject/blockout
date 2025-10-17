package com.blockout.mobilegateway.services.ffvb;

import com.blockout.mobilegateway.models.dto.match.MatchDTO;
import com.blockout.mobilegateway.services.clients.MatchClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Résout les paramètres attendus par la FFVB :
 *  - saison (ex: "2025/2026")
 *  - codent (code entité/club, ici on suppose Team.clubId le contient)
 *  - codmatch (code match FFVB : liveCode si présent, sinon externalCode)
 *
 * Adapte la logique ici si tes sources réelles diffèrent:
 *  - saison: vient de Pool.season (ou autre)
 *  - codent: clubId ou un champ dédié "ffvbCode" si tu l'as
 *  - codmatch: Match.liveCode ou un champ externe (ex: match.getExternalCode())
 */
@Service
@RequiredArgsConstructor
public class FFVBParamsResolver {

    private final MatchClientService matchClient;

    public FfvbParams resolve(Long matchId) {
        MatchDTO match = matchClient.getMatchById(matchId);
        String saison = match.getSeason();
        String codent = match.getLeagueCode();
        String codmatch = match.getMatchCode();

        return new FfvbParams(saison, codent, codmatch);
    }

    public record FfvbParams(String saison, String codent, String codmatch) {}
}