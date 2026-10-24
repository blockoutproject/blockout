package com.blockout.backend.following.api;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Reuses F03's generated calendar vocabulary at the personal-calendar MVC boundary. */
@Configuration(proxyBeanMethods = false)
public class FollowingWebConfiguration implements WebMvcConfigurer {
  /**
   * Binds exact generated wire values; unknown categories remain native conversion failures.
   *
   * @param registry MVC's existing query conversion owner
   */
  @Override
  public void addFormatters(FormatterRegistry registry) {
    registry.addConverter(
        String.class, CalendarCategoryEnum.class, CalendarCategoryEnum::fromValue);
  }
}
