package com.blockout.backend.config;

import com.fasterxml.jackson.annotation.Nulls;
import org.openapitools.jackson.nullable.JsonNullableJackson3Module;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.type.LogicalType;

/** Configures strict request binding while preserving generated nullable-field presence. */
@Configuration(proxyBeanMethods = false)
public class HttpConfiguration {
  /**
   * Rejects missing generated constructor arguments, unknown properties, scalar coercion and null
   * collection contents. Generated constructors bind required fields; nullable arguments still
   * accept explicit null. Current request collections have non-nullable contents. Generated
   * response maps retain their explicit additional-property policy. Textual coercion is configured
   * separately because ALLOW_COERCION_OF_SCALARS does not govern conversion into strings.
   *
   * @return customizer applied to the MVC JSON converter
   */
  @Bean
  JsonMapperBuilderCustomizer contractJson() {
    return builder ->
        builder
            .addModule(new JsonNullableJackson3Module())
            .changeDefaultNullHandling(value -> value.withContentNulls(Nulls.FAIL))
            .enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES)
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .withCoercionConfig(
                LogicalType.Textual,
                coercion ->
                    coercion
                        .setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
                        .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
                        .setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail))
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT);
  }
}
