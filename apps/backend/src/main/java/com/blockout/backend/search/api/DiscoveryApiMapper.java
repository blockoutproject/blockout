package com.blockout.backend.search.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.ClubSearchResponse;
import com.blockout.backend.generated.mobile.model.ClubSummaryResponse;
import com.blockout.backend.generated.mobile.model.PoolSearchResponse;
import com.blockout.backend.generated.mobile.model.PoolSummaryResponse;
import com.blockout.backend.generated.mobile.model.TeamSearchResponse;
import com.blockout.backend.generated.mobile.model.TeamSummaryResponse;
import com.blockout.backend.search.application.SearchPage;
import com.blockout.backend.sporting.api.ConsultationApiMapper;
import com.blockout.backend.sporting.application.ConsultationViews;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Canonical public club mapping; F03 retains complete team/pool and identity mapping. */
@Mapper(config = MappingConfiguration.class, uses = ConsultationApiMapper.class)
public interface DiscoveryApiMapper {
  /**
   * Projects a current club page while preserving its opaque continuation.
   *
   * @param page authorized current page with exactly the club variant populated
   * @param nextCursor encoded boundary, or null at exhaustion
   * @return generated collection in current search order
   */
  default ClubSearchResponse toClubDto(SearchPage page, String nextCursor) {
    return new ClubSearchResponse(
            toClubDtos(page.items().stream().map(SearchPage.Summary::club).toList()))
        .nextCursor(nextCursor);
  }

  /**
   * Selects current team variants before delegating the complete cards to their sporting owner.
   *
   * @param page authorized current page with exactly the team variant populated
   * @param nextCursor encoded boundary, or null at exhaustion
   * @return generated collection in current search order
   */
  default TeamSearchResponse toTeamDto(SearchPage page, String nextCursor) {
    return new TeamSearchResponse(
            toTeamDtos(page.items().stream().map(SearchPage.Summary::team).toList()))
        .nextCursor(nextCursor);
  }

  /**
   * Selects current pool variants before delegating the complete cards to their sporting owner.
   *
   * @param page authorized current page with exactly the pool variant populated
   * @param nextCursor encoded boundary, or null at exhaustion
   * @return generated collection in current search order
   */
  default PoolSearchResponse toPoolDto(SearchPage page, String nextCursor) {
    return new PoolSearchResponse(
            toPoolDtos(page.items().stream().map(SearchPage.Summary::pool).toList()))
        .nextCursor(nextCursor);
  }

  /**
   * Maps the search-owned public club context through the shared identity mapping.
   *
   * @param source authorized club card, or null
   * @return its public club card, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  ClubSummaryResponse toDto(SearchPage.Club source);

  /**
   * Maps the selected club variants in search order.
   *
   * @param source current club variants, or null
   * @return generated public cards, or null
   */
  List<ClubSummaryResponse> toClubDtos(List<SearchPage.Club> source);

  /**
   * Maps each complete team card through the owning F03 mapper.
   *
   * @param source current team variants, or null
   * @return generated public cards in source order, or null
   */
  List<TeamSummaryResponse> toTeamDtos(List<ConsultationViews.TeamSummary> source);

  /**
   * Maps each complete pool card through the owning F03 mapper.
   *
   * @param source current pool variants, or null
   * @return generated public cards in source order, or null
   */
  List<PoolSummaryResponse> toPoolDtos(List<ConsultationViews.PoolSummary> source);
}
