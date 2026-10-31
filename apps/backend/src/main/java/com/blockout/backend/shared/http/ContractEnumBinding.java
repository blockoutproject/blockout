package com.blockout.backend.shared.http;

import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.MatchDocumentKindEnum;
import com.blockout.backend.generated.mobile.model.SearchResourceTypeEnum;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import java.beans.PropertyEditorSupport;
import java.util.function.Function;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.InitBinder;

/** Binds implemented HTTP enum parameters using only their generated contract values. */
@ControllerAdvice
public class ContractEnumBinding {
  /**
   * Keeps request binding exact without Spring's fallback from a failed converter to Java enum
   * names. Native required/default handling remains unchanged; JSON keeps its generated mapping.
   *
   * @param binder request-owned native binder; each editor has the same bounded lifecycle
   */
  @InitBinder
  void bindEnums(WebDataBinder binder) {
    register(binder, CalendarCategoryEnum.class, CalendarCategoryEnum::fromValue);
    register(binder, MatchDocumentKindEnum.class, MatchDocumentKindEnum::fromValue);
    register(binder, SearchResourceTypeEnum.class, SearchResourceTypeEnum::fromValue);
    register(binder, SportFormatEnum.class, SportFormatEnum::fromValue);
    register(binder, SportGenderEnum.class, SportGenderEnum::fromValue);
    register(binder, TeamLogoSelectionEnum.class, TeamLogoSelectionEnum::fromValue);
  }

  /**
   * Uses Spring's editor precedence for one explicit generated enum, without duplicating values.
   *
   * @param binder current request's binding owner
   * @param type generated parameter type consumed by an implemented HTTP boundary
   * @param parse generated exact wire parser; rejected values retain native type-mismatch handling
   * @param <E> generated enum type
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
