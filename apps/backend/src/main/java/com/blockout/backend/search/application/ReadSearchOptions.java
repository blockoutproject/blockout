package com.blockout.backend.search.application;

import com.blockout.backend.generated.mobile.model.SearchResourceTypeEnum;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import com.blockout.backend.sporting.application.ConsultationViewMapper;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Current PostgreSQL choices; engine availability and facets never select public filters. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReadSearchOptions {
  private final ReadSportingData sporting;
  private final ConsultationViewMapper mapper;

  /**
   * Reads choices in one current sporting snapshot and retains canonical contract vocabularies.
   *
   * @param resourceType admitted team or pool tab
   * @return current visible seasons and active divisions, including successful empty catalogues
   */
  public SearchOptions read(SearchResourceTypeEnum resourceType) {
    Kind kind =
        switch (resourceType) {
          case TEAM -> Kind.TEAM;
          case POOL -> Kind.POOL;
        };
    return new SearchOptions(
        resourceType,
        sporting.publicSeasons(kind),
        sporting.publicDivisions().stream().map(mapper::toView).toList(),
        List.of(SportFormatEnum.values()),
        List.of(SportGenderEnum.values()));
  }
}
