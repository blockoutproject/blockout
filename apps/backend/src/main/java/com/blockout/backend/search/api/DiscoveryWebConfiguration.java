package com.blockout.backend.search.api;

import com.blockout.backend.generated.mobile.model.SearchResourceTypeEnum;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Binds discovery query enums by their exact generated wire values, rather than Java constant
 * names.
 */
@Configuration(proxyBeanMethods = false)
public class DiscoveryWebConfiguration implements WebMvcConfigurer {
  /**
   * Registers native Spring converters backed by the generated enum parsers; unknown values fail.
   *
   * @param registry MVC's conversion owner for query parameters
   */
  @Override
  public void addFormatters(FormatterRegistry registry) {
    registry.addConverter(
        String.class, SearchResourceTypeEnum.class, SearchResourceTypeEnum::fromValue);
    registry.addConverter(String.class, SportFormatEnum.class, SportFormatEnum::fromValue);
    registry.addConverter(String.class, SportGenderEnum.class, SportGenderEnum::fromValue);
  }
}
