package com.blockout.backend.sporting.api;

import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Binds canonical lowercase logo selection values at the generated HTTP boundary. */
@Configuration(proxyBeanMethods = false)
public class ConsultationHttpConfiguration implements WebMvcConfigurer {
  /**
   * Registers the contract enum parser instead of Spring's Java enum-name parser.
   *
   * @param registry native MVC conversion registry
   */
  @Override
  public void addFormatters(FormatterRegistry registry) {
    registry.addConverter(
        String.class, TeamLogoSelectionEnum.class, TeamLogoSelectionEnum::fromValue);
  }
}
