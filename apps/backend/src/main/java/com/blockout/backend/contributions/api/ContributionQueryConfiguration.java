package com.blockout.backend.contributions.api;

import com.blockout.backend.generated.mobile.model.StreamModerationFilterEnum;
import com.blockout.backend.generated.mobile.model.StreamPlatformEnum;
import com.blockout.backend.generated.mobile.model.StreamVersionFilterEnum;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Binds F08 query enums by their canonical wire values rather than Java constant names. */
@Configuration(proxyBeanMethods = false)
public class ContributionQueryConfiguration implements WebMvcConfigurer {
  /**
   * Registers native MVC converters for the generated contribution filters. Unknown values remain
   * invalid requests through each generated enum's strict parser.
   *
   * @param registry MVC's shared conversion registry for request parameters
   */
  @Override
  public void addFormatters(FormatterRegistry registry) {
    registry.addConverter(String.class, StreamPlatformEnum.class, StreamPlatformEnum::fromValue);
    registry.addConverter(
        String.class, StreamModerationFilterEnum.class, StreamModerationFilterEnum::fromValue);
    registry.addConverter(
        String.class, StreamVersionFilterEnum.class, StreamVersionFilterEnum::fromValue);
  }
}
