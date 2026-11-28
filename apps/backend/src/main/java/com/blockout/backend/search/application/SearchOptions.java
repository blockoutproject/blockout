package com.blockout.backend.search.application;

import com.blockout.backend.generated.mobile.model.SearchResourceTypeEnum;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import java.util.List;

/** Detached current choices for one sporting search tab, independent of engine documents. */
public record SearchOptions(
    SearchResourceTypeEnum resourceType,
    List<SeasonView> seasons,
    List<ConsultationViews.Division> divisions,
    List<SportFormatEnum> formats,
    List<SportGenderEnum> genders) {
  /**
   * Copies current owner values before leaving their read transaction.
   *
   * @param resourceType exact team or pool tab
   * @param seasons distinct currently viewable seasons, newest first
   * @param divisions active current presentation, ordered by case-folded name then UUID
   * @param formats canonical format choices in contract order
   * @param genders canonical gender choices in contract order
   */
  public SearchOptions {
    seasons = List.copyOf(seasons);
    divisions = List.copyOf(divisions);
    formats = List.copyOf(formats);
    genders = List.copyOf(genders);
  }
}
