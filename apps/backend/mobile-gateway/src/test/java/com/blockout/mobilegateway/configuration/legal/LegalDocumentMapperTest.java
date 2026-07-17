package com.blockout.mobilegateway.configuration.legal;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.config.client.model.LegalDocumentInternalResponse;
import com.blockout.mobilegateway.configuration.legal.api.LegalDocumentApiMapper;
import com.blockout.mobilegateway.configuration.legal.application.LegalDocumentView;
import com.blockout.mobilegateway.configuration.legal.outbound.ConfigLegalDocumentMapper;
import com.blockout.mobilegateway.generated.model.UpdateMobileLegalDocumentRequest;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class LegalDocumentMapperTest {

    private final LegalDocumentApiMapper apiMapper = Mappers.getMapper(LegalDocumentApiMapper.class);
    private final ConfigLegalDocumentMapper clientMapper = Mappers.getMapper(ConfigLegalDocumentMapper.class);

    @Test
    void generatedBoundariesAreMappedThroughApplicationRecords() {
        var clientResponse = new LegalDocumentInternalResponse()
                .type("privacy")
                .title("Privacy")
                .version("2")
                .content("Body");

        LegalDocumentView view = clientMapper.toView(clientResponse);
        var apiResponse = apiMapper.toResponse(view);

        assertThat(view).isEqualTo(new LegalDocumentView("privacy", "Privacy", "2", "Body"));
        assertThat(apiResponse.getType()).isEqualTo("privacy");
        assertThat(apiResponse.getTitle()).isEqualTo("Privacy");
        assertThat(apiResponse.getVersion()).isEqualTo("2");
        assertThat(apiResponse.getContent()).isEqualTo("Body");
    }

    @Test
    void nullablePartialUpdateStaysNullableAcrossBothAdapters() {
        var apiRequest = new UpdateMobileLegalDocumentRequest().title("Updated");

        var command = apiMapper.toCommand(apiRequest);
        var clientRequest = clientMapper.toRequest(command);

        assertThat(clientRequest.getTitle()).isEqualTo("Updated");
        assertThat(clientRequest.getVersion()).isNull();
        assertThat(clientRequest.getContent()).isNull();
    }
}
