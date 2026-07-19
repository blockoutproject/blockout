package com.blockout.clubs.club.persistence;

import com.blockout.clubs.club.application.ClubChange;
import com.blockout.clubs.club.application.ClubPage;
import com.blockout.clubs.club.application.ClubStore;
import com.blockout.clubs.club.application.ClubUpdate;
import com.blockout.clubs.club.application.ClubUpdatePlan;
import com.blockout.clubs.club.application.ClubView;
import com.blockout.clubs.club.application.CreateClubCommand;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaClubStore implements ClubStore {

    private final ClubRepository repository;
    private final ClubPersistenceMapper mapper;

    @Override
    public List<ClubView> findLegacy(List<String> ids, Boolean active) {
        return repository.findFilteredLegacy(ids, ids.size(), active).stream().map(mapper::toView).toList();
    }

    @Override
    public ClubPage findPage(List<String> ids, Boolean active, int page, int pageSize) {
        PageRequest request = PageRequest.of(page, pageSize, Sort.by("name").ascending().and(Sort.by("id")));
        Page<ClubEntity> result = repository.findFiltered(ids, ids.size(), active, request);
        List<ClubView> items = result.getContent().stream().map(mapper::toView).toList();
        return new ClubPage(items, page, pageSize, result.getTotalElements(), result.hasNext());
    }

    @Override
    public Optional<ClubView> findById(String id) {
        return repository.findById(id).map(mapper::toView);
    }

    @Override
    public ClubView create(CreateClubCommand command, String logoUrl) {
        ClubEntity entity = mapper.toEntity(command);
        entity.setActive(true);
        entity.setLogoUrl(logoUrl);
        return mapper.toView(repository.saveAndFlush(entity));
    }

    @Override
    public Optional<ClubUpdate> findForUpdate(String id) {
        return repository.findById(id).map(JpaClubUpdate::new);
    }

    @Override
    public Optional<ClubChange> deactivate(String id) {
        return repository.findById(id).map(entity -> {
            ClubView before = mapper.toView(entity);
            if (Boolean.FALSE.equals(entity.getActive())) {
                return new ClubChange(before, before);
            }
            entity.setActive(false);
            return new ClubChange(before, mapper.toView(repository.saveAndFlush(entity)));
        });
    }

    private final class JpaClubUpdate implements ClubUpdate {

        private final ClubEntity entity;

        private JpaClubUpdate(ClubEntity entity) {
            this.entity = entity;
        }

        @Override
        public ClubView current() {
            return mapper.toView(entity);
        }

        @Override
        public ClubChange apply(ClubUpdatePlan plan) {
            ClubView before = current();
            mapper.apply(plan.command(), entity);
            if (plan.replaceLogo()) {
                entity.setLogoUrl(plan.replacementLogoUrl());
            }
            entity.setActive(plan.active());
            return new ClubChange(before, mapper.toView(repository.saveAndFlush(entity)));
        }
    }
}
