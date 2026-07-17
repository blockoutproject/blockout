package com.blockout.config.legal.api.v2;

import com.blockout.config.generated.model.LegalDocumentInternalResponse;
import com.blockout.config.generated.model.UpdateLegalDocumentInternalRequest;
import com.blockout.config.legal.application.LegalDocumentSnapshot;
import com.blockout.config.legal.application.UpdateLegalDocumentCommand;
import com.blockout.config.shared.mapping.ConfigMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = ConfigMapperConfig.class)
public interface LegalDocumentApiMapper {

    UpdateLegalDocumentCommand toCommand(UpdateLegalDocumentInternalRequest request);

    LegalDocumentInternalResponse toResponse(LegalDocumentSnapshot snapshot);
}
