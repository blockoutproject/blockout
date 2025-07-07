package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.competition.CompetitionAssociationDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CompetitionClientService {

    private static final Logger logger = LoggerFactory.getLogger(CompetitionClientService.class);

    private final ApiClientService apiClientService;
    private final ApiClientProperties apiClientProperties;

    public List<CompetitionAssociationDTO> getActiveAssociationsByTeam(Long teamId) {
        String url = apiClientProperties.getCompetition().getUrl() + "/teams/" + teamId + "/pools";

        logger.info("Calling getActiveAssociationsByTeam", keyValue("teamId", teamId), keyValue("url", url));

        ResponseEntity<CompetitionAssociationDTO[]> response = apiClientService.get(url, CompetitionAssociationDTO[].class);

        CompetitionAssociationDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public List<CompetitionAssociationDTO> getActiveAssociationsByPool(Long poolId) {
        String url = apiClientProperties.getCompetition().getUrl() + "/pools/" + poolId + "/teams";

        logger.info("Calling getActiveAssociationsByPool", keyValue("poolId", poolId), keyValue("url", url));

        ResponseEntity<CompetitionAssociationDTO[]> response = apiClientService.get(url, CompetitionAssociationDTO[].class);

        CompetitionAssociationDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}