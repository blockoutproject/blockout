package com.blockout.backend.api.config;

import org.mapstruct.*;

/**
 * Shared generated-adapter mapping policy: constructor injection, native null checks and complete
 * targets.
 */
@MapperConfig(
    componentModel = MappingConstants.ComponentModel.SPRING,
    injectionStrategy = InjectionStrategy.CONSTRUCTOR,
    nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION,
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface ApiMappingConfiguration {}
