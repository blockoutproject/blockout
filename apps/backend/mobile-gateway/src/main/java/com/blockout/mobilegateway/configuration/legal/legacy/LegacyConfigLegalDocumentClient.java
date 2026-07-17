package com.blockout.mobilegateway.configuration.legal.legacy;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.configuration.legal.outbound.ConfigServiceUrl;
import com.blockout.mobilegateway.models.dto.config.LegalDocumentDTO;
import com.blockout.mobilegateway.models.dto.config.LegalDocumentUpdateDTO;
import com.blockout.mobilegateway.services.clients.ApiClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class LegacyConfigLegalDocumentClient {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public LegalDocumentDTO getByType(String type) {
        ResponseEntity<LegalDocumentDTO> response = apiClientService.get(url(type), LegalDocumentDTO.class);
        return response.getBody();
    }

    public LegalDocumentDTO update(String type, LegalDocumentUpdateDTO request) {
        ResponseEntity<LegalDocumentDTO> response = apiClientService.put(url(type), request, LegalDocumentDTO.class);
        return response.getBody();
    }

    private String url(String type) {
        return UriComponentsBuilder.fromUriString(
                        ConfigServiceUrl.legacyBasePath(apiClientProperties.getConfig().getUrl()))
                .pathSegment("legal", type)
                .build()
                .toUriString();
    }
}
