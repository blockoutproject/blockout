package com.blockout.search.search.api.mappers;

import com.blockout.search.search.api.models.ClubSearchInternalResponse;
import com.blockout.search.search.api.models.PoolSearchInternalResponse;
import com.blockout.search.search.api.models.TeamSearchInternalResponse;
import com.blockout.search.search.application.views.ClubSearchResult;
import com.blockout.search.search.application.views.PoolSearchResult;
import com.blockout.search.search.application.views.TeamSearchResult;
import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.ReportingPolicy;

/**
 * Maps application search results to generated internal responses.
 */
@Mapper(
    componentModel = "spring",
    injectionStrategy = InjectionStrategy.CONSTRUCTOR,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface SearchApiMapper {

    /**
     * Maps a Club search result to the internal response.
     *
     * @param result application Club search result.
     * @return generated internal response.
     */
    ClubSearchInternalResponse toInternalResponse(ClubSearchResult result);

    /**
     * Maps a Team search result to the internal response.
     *
     * @param result application Team search result.
     * @return generated internal response.
     */
    TeamSearchInternalResponse toInternalResponse(TeamSearchResult result);

    /**
     * Maps a Pool search result to the internal response.
     *
     * @param result application Pool search result.
     * @return generated internal response.
     */
    PoolSearchInternalResponse toInternalResponse(PoolSearchResult result);
}
