package com.blockout.config.legal.persistence;

import com.blockout.config.legal.application.LegalDocumentSnapshot;
import com.blockout.config.legal.application.UpdateLegalDocumentCommand;
import com.blockout.config.shared.mapping.ConfigMapperConfig;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(config = ConfigMapperConfig.class)
public interface LegalDocumentPersistenceMapper {

    LegalDocumentSnapshot toSnapshot(LegalDocumentEntity entity);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "type", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    void apply(UpdateLegalDocumentCommand command, @MappingTarget LegalDocumentEntity entity);
}
