package com.blockout.search.club.outbound;

import com.blockout.search.club.application.ClubSearchView;
import com.blockout.search.shared.mapping.SearchMappingConfig;
import org.mapstruct.Mapper;

@Mapper(config = SearchMappingConfig.class)
interface ClubSearchDocumentMapper {

    ClubSearchView toView(ClubSearchDocument document);
}
