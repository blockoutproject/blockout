package com.blockout.mobilegateway.configuration.legal.outbound;

import com.blockout.config.client.model.LegalDocumentInternalResponse;
import com.blockout.config.client.model.UpdateLegalDocumentInternalRequest;
import com.blockout.mobilegateway.configuration.legal.application.LegalDocumentView;
import com.blockout.mobilegateway.configuration.legal.application.UpdateLegalDocumentCommand;
import com.blockout.mobilegateway.shared.mapping.MobileGatewayMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = MobileGatewayMapperConfig.class)
public interface ConfigLegalDocumentMapper {

    UpdateLegalDocumentInternalRequest toRequest(UpdateLegalDocumentCommand command);

    LegalDocumentView toView(LegalDocumentInternalResponse response);
}
