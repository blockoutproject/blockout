package com.blockout.search.pool.outbound;

import com.blockout.search.pool.application.PoolSearchView;
import com.blockout.search.shared.mapping.SearchMappingConfig;
import org.mapstruct.Mapper;

@Mapper(config = SearchMappingConfig.class)
interface PoolSearchDocumentMapper {

    PoolSearchView toView(PoolSearchDocument document);
}
