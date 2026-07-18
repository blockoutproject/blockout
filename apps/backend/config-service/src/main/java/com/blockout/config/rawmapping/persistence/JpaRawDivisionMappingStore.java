package com.blockout.config.rawmapping.persistence;

import com.blockout.config.rawmapping.application.CreateRawDivisionMappingCommand;
import com.blockout.config.rawmapping.application.LegacyRawDivisionMappingSeed;
import com.blockout.config.rawmapping.application.RawDivisionMappingStore;
import com.blockout.config.rawmapping.application.RawDivisionMappingView;
import com.blockout.config.rawmapping.application.UpdateRawDivisionMappingCommand;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaRawDivisionMappingStore implements RawDivisionMappingStore {

    private final RawDivisionMappingRepository repository;
    private final RawDivisionMappingPersistenceMapper mapper;

    @Override
    public RawDivisionMappingView create(CreateRawDivisionMappingCommand command) {
        return mapper.toView(repository.save(mapper.toEntity(command)));
    }

    @Override
    public RawDivisionMappingView createLegacy(LegacyRawDivisionMappingSeed seed) {
        return mapper.toView(repository.save(mapper.toEntity(seed)));
    }

    @Override
    public List<RawDivisionMappingView> find(String leagueCode, String season) {
        return repository.findByLeagueCodeAndSeason(leagueCode, season).stream().map(mapper::toView).toList();
    }

    @Override
    public Optional<RawDivisionMappingView> findById(Long id) {
        return repository.findById(id).map(mapper::toView);
    }

    @Override
    public Optional<RawDivisionMappingView> update(Long id, UpdateRawDivisionMappingCommand command) {
        return repository.findById(id).map(entity -> update(entity, command));
    }

    private RawDivisionMappingView update(
            RawDivisionMappingEntity entity,
            UpdateRawDivisionMappingCommand command) {
        mapper.apply(command, entity);
        return mapper.toView(repository.save(entity));
    }
}
