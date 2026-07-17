package com.blockout.mobilegateway.configuration.legal.outbound;

import com.blockout.config.client.api.LegalDocumentsClient;
import com.blockout.mobilegateway.configuration.legal.application.LegalDocumentGateway;
import com.blockout.mobilegateway.configuration.legal.application.LegalDocumentView;
import com.blockout.mobilegateway.configuration.legal.application.UpdateLegalDocumentCommand;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class ConfigServiceLegalDocumentGateway implements LegalDocumentGateway {

    private final LegalDocumentsClient userClient;
    private final LegalDocumentsClient m2mClient;
    private final ConfigLegalDocumentMapper mapper;

    public ConfigServiceLegalDocumentGateway(
            @Qualifier("configLegalDocumentsUserClient") LegalDocumentsClient userClient,
            @Qualifier("configLegalDocumentsM2mClient") LegalDocumentsClient m2mClient,
            ConfigLegalDocumentMapper mapper) {
        this.userClient = userClient;
        this.m2mClient = m2mClient;
        this.mapper = mapper;
    }

    @Override
    public LegalDocumentView getByType(String type) {
        return mapper.toView(client().getLegalDocument(type));
    }

    @Override
    public LegalDocumentView update(String type, UpdateLegalDocumentCommand command) {
        return mapper.toView(client().updateLegalDocument(type, mapper.toRequest(command)));
    }

    private LegalDocumentsClient client() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication instanceof JwtAuthenticationToken && authentication.isAuthenticated()
                ? userClient
                : m2mClient;
    }
}
