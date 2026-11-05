package com.blockout.backend.contributions.api;

import com.blockout.backend.generated.mobile.model.StreamModerationFilterEnum;
import com.blockout.backend.generated.mobile.model.StreamPlatformEnum;
import com.blockout.backend.generated.mobile.model.StreamVersionFilterEnum;
import java.beans.PropertyEditorSupport;
import java.util.function.Function;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.InitBinder;

/** Strict generated-enum query binding scoped to the F08 moderation controller. */
@ControllerAdvice(assignableTypes = ContributionModerationController.class)
public class ContributionQueryBinding {
  /**
   * Binds canonical wire values with native editor precedence, preventing Spring's fallback to Java
   * enum names or null for blank values after a failed converter. JSON keeps its generated mapping,
   * and omitted optional parameters retain their ordinary defaults.
   *
   * @param binder current request's native binding owner
   */
  @InitBinder
  void bindEnums(WebDataBinder binder) {
    register(binder, StreamPlatformEnum.class, StreamPlatformEnum::fromValue);
    register(binder, StreamModerationFilterEnum.class, StreamModerationFilterEnum::fromValue);
    register(binder, StreamVersionFilterEnum.class, StreamVersionFilterEnum::fromValue);
  }

  /**
   * Gives one generated parser precedence over native enum-name recovery for this request only.
   *
   * @param binder request-owned registry; editors are never shared between requests
   * @param type exact generated F08 query parameter type
   * @param parse canonical generated parser without a second vocabulary
   * @param <E> generated enum consumed by the moderation controller
   */
  private static <E extends Enum<E>> void register(
      WebDataBinder binder, Class<E> type, Function<String, E> parse) {
    binder.registerCustomEditor(
        type,
        new PropertyEditorSupport() {
          /** {@inheritDoc} */
          @Override
          public void setAsText(String text) {
            setValue(parse.apply(text));
          }
        });
  }
}
