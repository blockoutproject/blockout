package com.blockout.config.legal.api.v2;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.config.generated.api.LegalDocumentsApi;
import com.blockout.config.generated.model.LegalDocumentInternalResponse;
import com.blockout.config.generated.model.UpdateLegalDocumentInternalRequest;
import com.blockout.config.legal.application.LegalDocumentSnapshot;
import com.blockout.config.legal.application.UpdateLegalDocumentCommand;
import com.blockout.config.shared.api.v2.ConfigProblemFactory;
import com.blockout.shared.model.ProblemDetail;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

class LegalDocumentV2BoundaryTest {

    private final LegalDocumentApiMapper mapper = Mappers.getMapper(LegalDocumentApiMapper.class);

    @Test
    void implementsTheGeneratedV2BoundaryAndMapsOnlyContractFields() {
        assertThat(LegalDocumentsApi.class).isAssignableFrom(LegalDocumentV2Controller.class);
        assertThat(LegalDocumentsApi.PATH_GET_LEGAL_DOCUMENT).isEqualTo("/api/v2/config/legal/{type}");

        UpdateLegalDocumentCommand command = mapper.toCommand(
                new UpdateLegalDocumentInternalRequest().title(null).version("2.0").content(null));
        assertThat(command).isEqualTo(new UpdateLegalDocumentCommand(null, "2.0", null));

        LegalDocumentInternalResponse response = mapper.toResponse(new LegalDocumentSnapshot(
                7L,
                "privacy",
                "Privacy",
                "2.0",
                "# Privacy",
                LocalDateTime.of(2025, 1, 2, 3, 4, 5),
                LocalDateTime.of(2025, 6, 7, 8, 9, 10)));
        assertThat(response.getType()).isEqualTo("privacy");
        assertThat(response.getTitle()).isEqualTo("Privacy");
        assertThat(response.getVersion()).isEqualTo("2.0");
        assertThat(response.getContent()).isEqualTo("# Privacy");
    }

    @Test
    void emitsStableCamelCaseProblemDetailsWithARequestIdentifier() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v2/config/legal/missing");
        request.addHeader(ConfigProblemFactory.REQUEST_ID_HEADER, "request-123");
        ResponseEntity<ProblemDetail> response = new ConfigProblemFactory().response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "legal_document_not_found",
                "The legal document could not be found.",
                request);

        ObjectMapper canonicalMapper = JsonMapper.builder().build();
        JsonNode body = canonicalMapper.readTree(canonicalMapper.writeValueAsBytes(response.getBody()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getHeaders().getFirst(ConfigProblemFactory.REQUEST_ID_HEADER))
                .isEqualTo("request-123");
        assertThat(body.get("code").asText()).isEqualTo("legal_document_not_found");
        assertThat(body.get("requestId").asText()).isEqualTo("request-123");
        assertThat(body.has("request_id")).isFalse();
    }

    @Test
    void replacesAnUnsafeOversizedRequestIdentifier() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v2/config/legal/missing");
        request.addHeader(ConfigProblemFactory.REQUEST_ID_HEADER, "x".repeat(256));

        assertThat(ConfigProblemFactory.resolveRequestId(request))
                .hasSize(36)
                .isNotEqualTo("x".repeat(256));
    }
}
