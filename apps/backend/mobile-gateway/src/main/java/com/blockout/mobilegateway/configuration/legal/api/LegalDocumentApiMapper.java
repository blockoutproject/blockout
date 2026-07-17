package com.blockout.mobilegateway.configuration.legal.api;

import com.blockout.mobilegateway.configuration.legal.application.LegalDocumentView;
import com.blockout.mobilegateway.configuration.legal.application.UpdateLegalDocumentCommand;
import com.blockout.mobilegateway.generated.model.MobileLegalDocument;
import com.blockout.mobilegateway.generated.model.UpdateMobileLegalDocumentRequest;
import com.blockout.mobilegateway.shared.mapping.MobileGatewayMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = MobileGatewayMapperConfig.class)
public interface LegalDocumentApiMapper {

    UpdateLegalDocumentCommand toCommand(UpdateMobileLegalDocumentRequest request);

    MobileLegalDocument toResponse(LegalDocumentView view);
}
