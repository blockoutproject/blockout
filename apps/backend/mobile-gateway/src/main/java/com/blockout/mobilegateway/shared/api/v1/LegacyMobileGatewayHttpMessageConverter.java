package com.blockout.mobilegateway.shared.api.v1;

import java.lang.reflect.Type;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;

final class LegacyMobileGatewayHttpMessageConverter extends MappingJackson2HttpMessageConverter {

    private static final String LEGACY_DTO_PACKAGE = "com.blockout.mobilegateway.models.dto";

    LegacyMobileGatewayHttpMessageConverter(LegacyMobileGatewayJson legacyJson) {
        super(legacyJson.copyMapper());
    }

    @Override
    public boolean canRead(Class<?> clazz, MediaType mediaType) {
        return isLegacyDto(clazz) && super.canRead(clazz, mediaType);
    }

    @Override
    public boolean canRead(Type type, Class<?> contextClass, MediaType mediaType) {
        return type instanceof Class<?> clazz
                && isLegacyDto(clazz)
                && super.canRead(type, contextClass, mediaType);
    }

    @Override
    public boolean canWrite(Class<?> clazz, MediaType mediaType) {
        return false;
    }

    @Override
    public boolean canWrite(Type type, Class<?> clazz, MediaType mediaType) {
        return false;
    }

    private boolean isLegacyDto(Class<?> type) {
        Class<?> candidate = type.isArray() ? type.getComponentType() : type;
        return candidate.getPackageName().startsWith(LEGACY_DTO_PACKAGE);
    }
}
