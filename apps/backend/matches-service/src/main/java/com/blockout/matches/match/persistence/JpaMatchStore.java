package com.blockout.matches.match.persistence;

import com.blockout.matches.match.application.CreateMatchCommand;
import com.blockout.matches.match.application.DeactivateMatchesCommand;
import com.blockout.matches.match.application.MatchChange;
import com.blockout.matches.match.application.MatchDayQuery;
import com.blockout.matches.match.application.MatchDayStore;
import com.blockout.matches.match.application.MatchPage;
import com.blockout.matches.match.application.MatchQuery;
import com.blockout.matches.match.application.MatchSnapshot;
import com.blockout.matches.match.application.MatchStore;
import com.blockout.matches.match.application.MatchUpdate;
import com.blockout.matches.match.application.MatchUpdatePlan;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaMatchStore implements MatchStore, MatchDayStore {

    private final MatchRepository repository;
    private final MatchPersistenceMapper mapper;

    @Override
    public MatchSnapshot create(CreateMatchCommand command, MatchStatusEnum status, boolean active) {
        Match entity = mapper.toEntity(command);
        entity.setStatus(persistenceStatus(status));
        entity.setActive(active);
        return mapper.toSnapshot(repository.save(entity));
    }

    @Override
    public List<MatchSnapshot> findAll(MatchQuery query) {
        List<Long> teamIds = query.teamIds();
        return repository.findFiltered(
                        query.poolId(), persistenceStatus(query.status()), query.active(), teamIds, teamIds.size())
                .stream().map(mapper::toSnapshot).toList();
    }

    @Override
    public MatchPage findPage(MatchQuery query, int page, int pageSize) {
        List<Long> teamIds = query.teamIds();
        Page<Match> result = repository.findFilteredPage(
                query.poolId(), persistenceStatus(query.status()), query.active(), teamIds, teamIds.size(),
                PageRequest.of(page, pageSize));
        return new MatchPage(result.getContent().stream().map(mapper::toSnapshot).toList(),
                page, pageSize, result.getTotalElements(), result.hasNext());
    }

    @Override
    public Optional<MatchSnapshot> findById(Long id) {
        return repository.findById(id).map(mapper::toSnapshot);
    }

    @Override
    public Optional<MatchUpdate> findForUpdate(Long id) {
        return repository.findById(id).map(JpaMatchUpdate::new);
    }

    @Override
    public int deactivate(DeactivateMatchesCommand command) {
        List<Match> selected = repository.findByActiveTrueAndPoolIdAndMatchCodeIn(
                command.poolId(), command.missingMatchCodes());
        if (selected.isEmpty()) {
            return 0;
        }
        selected.forEach(match -> match.setActive(false));
        repository.saveAll(selected);
        return selected.size();
    }

    @Override
    public List<LocalDate> findUpcomingDays(LocalDate todayParis, MatchDayQuery query) {
        return repository.findDistinctUpcomingDatesIncludingToday(
                todayParis, query.poolIds(), query.poolIds().size(), query.teamIds(), query.teamIds().size());
    }

    @Override
    public List<LocalDate> findPastDays(Instant now, MatchDayQuery query) {
        return repository.findDistinctDatesUntil(
                now, query.poolIds(), query.poolIds().size(), query.teamIds(), query.teamIds().size());
    }

    @Override
    public List<MatchSnapshot> findUpcomingRange(Instant start, Instant end, MatchDayQuery query) {
        return repository.findAllInRangeAsc(start, end, query.poolIds(), query.poolIds().size(),
                        persistenceStatus(query.status()), query.teamIds(), query.teamIds().size(), query.active())
                .stream().map(mapper::toSnapshot).toList();
    }

    @Override
    public List<MatchSnapshot> findPastRange(Instant start, Instant end, MatchDayQuery query) {
        return repository.findAllInRangeDesc(start, end, query.poolIds(), query.poolIds().size(),
                        persistenceStatus(query.status()), query.teamIds(), query.teamIds().size(), query.active())
                .stream().map(mapper::toSnapshot).toList();
    }

    private MatchStatusEnum persistenceStatus(MatchStatusEnum status) {
        return status == null ? null : MatchStatusEnum.valueOf(status.getValue());
    }

    private final class JpaMatchUpdate implements MatchUpdate {
        private final Match entity;

        private JpaMatchUpdate(Match entity) {
            this.entity = entity;
        }

        @Override
        public MatchSnapshot current() {
            return mapper.toSnapshot(entity);
        }

        @Override
        public MatchChange prepare(MatchUpdatePlan plan) {
            MatchSnapshot before = current();
            mapper.replaceScraperFields(plan.command(), entity);
            entity.setStatus(persistenceStatus(plan.status()));
            entity.setActive(plan.active());
            return new MatchChange(before, current());
        }

        @Override
        public MatchSnapshot save() {
            return mapper.toSnapshot(repository.save(entity));
        }
    }
}
