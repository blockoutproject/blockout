package com.blockout.backend.config;

import org.openapitools.jackson.nullable.JsonNullableJackson3Module;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;

/** Configures strict request binding while preserving generated nullable-field presence. */
@Configuration(proxyBeanMethods = false)
public class HttpConfiguration {
  /**
   * Rejects unknown request properties and coercion instead of silently changing submitted values.
   * Generated response maps retain their explicit additional-property policy.
   *
   * @return customizer applied to the MVC JSON converter
   */
  @Bean
  JsonMapperBuilderCustomizer contractJson() {
    return builder ->
        builder
            .addModule(new JsonNullableJackson3Module())
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT);
  }
}
