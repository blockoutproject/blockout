package com.blockout.mobilegateway.configuration.legal.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.config.client.api.LegalDocumentsClient;
import com.blockout.config.client.invoker.ApiClient;
import com.blockout.config.client.model.LegalDocumentInternalResponse;
import com.blockout.config.client.model.UpdateLegalDocumentInternalRequest;
import com.blockout.mobilegateway.configuration.legal.application.UpdateLegalDocumentCommand;
import java.time.Instant;
import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

class ConfigServiceLegalDocumentGatewayTest {

    private final StubClient userClient = new StubClient("user");
    private final StubClient m2mClient = new StubClient("m2m");
    private final ConfigServiceLegalDocumentGateway gateway = new ConfigServiceLegalDocumentGateway(
            userClient,
            m2mClient,
            Mappers.getMapper(ConfigLegalDocumentMapper.class));

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void publicReadUsesM2mClient() {
        assertThat(gateway.getByType("privacy").title()).isEqualTo("m2m");
        assertThat(m2mClient.calls).isEqualTo(1);
        assertThat(userClient.calls).isZero();
    }

    @Test
    void authenticatedUpdateUsesForwardedUserClient() {
        Instant now = Instant.now();
        Jwt jwt = new Jwt("user-token", now, now.plusSeconds(60), Map.of("alg", "none"), Map.of("sub", "user"));
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
                jwt,
                List.of(new SimpleGrantedAuthority("SCOPE_update:legal"))));

        assertThat(gateway.update("privacy", new UpdateLegalDocumentCommand("Title", null, null)).title())
                .isEqualTo("user");
        assertThat(userClient.calls).isEqualTo(1);
        assertThat(m2mClient.calls).isZero();
    }

    private static final class StubClient extends LegalDocumentsClient {

        private final String title;
        private int calls;

        private StubClient(String title) {
            super(new ApiClient());
            this.title = title;
        }

        @Override
        public LegalDocumentInternalResponse getLegalDocument(String type) {
            calls++;
            return response(type);
        }

        @Override
        public LegalDocumentInternalResponse updateLegalDocument(
                String type,
                UpdateLegalDocumentInternalRequest request) {
            calls++;
            return response(type);
        }

        private LegalDocumentInternalResponse response(String type) {
            return new LegalDocumentInternalResponse()
                    .type(type)
                    .title(title)
                    .version("1")
                    .content("Body");
        }
    }
}
