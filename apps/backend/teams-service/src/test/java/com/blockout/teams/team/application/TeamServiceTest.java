package com.blockout.teams.team.application;

import com.blockout.shared.model.FollowerCountDeltaEnum;
import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.teams.team.persistence.TeamEntity;
import com.blockout.teams.team.persistence.JpaTeamStore;
import com.blockout.teams.team.persistence.TeamPersistenceMapper;
import com.blockout.teams.team.persistence.TeamRepository;
import com.blockout.teams.team.domain.TeamLogoUpload;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class TeamServiceTest {

    private final TeamPersistenceMapper mapper = Mappers.getMapper(TeamPersistenceMapper.class);

    @Test
    void canonicalCreateOwnsIdentifierFollowersLifecycleLogoAndAuditFields() {
        RepositoryDouble repository = new RepositoryDouble();
        EventPublisherDouble publisher = new EventPublisherDouble();
        TeamService service = service(repository, new LogoStorageDouble(), publisher);

        TeamView result = service.create(command());

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.followersCount()).isZero();
        assertThat(result.active()).isTrue();
        assertThat(result.logoUrl()).isNull();
        assertThat(publisher.published).containsExactly(TeamUpsertFact.from(result));
    }

    @Test
    void updatePreservesNullFieldsAndExplicitlyRemovesLogo() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = entity("https://logo", false, 4L);
        LogoStorageDouble storage = new LogoStorageDouble();
        TeamService service = service(repository, storage, new EventPublisherDouble());

        TeamView result = service.update(1L, new UpdateTeamCommand(
                null, null, "Updated", null, null, null, null, null, null, true), TeamLogoChange.remove());

        assertThat(result.rawName()).isEqualTo("Raw");
        assertThat(result.name()).isEqualTo("Updated");
        assertThat(result.active()).isTrue();
        assertThat(result.logoUrl()).isNull();
        assertThat(storage.deleted).containsExactly("https://logo");
    }

    @Test
    void followerDecrementKeepsTheExistingZeroFloor() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = entity(null, true, 0L);
        JpaTeamStore store = store(repository);
        TeamFollowerProjectionService service = new TeamFollowerProjectionService(store);

        TeamView result = service.updateFollowers(
                new TeamFollowerCommand(1L, 9L, FollowerCountDeltaEnum.DECREMENT));

        assertThat(result.followersCount()).isZero();
    }

    @Test
    void canonicalPageUsesStableRawNameAndIdentifierOrdering() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.pageItems = List.of(entity(null, true, 2L));
        TeamService service = service(repository, new LogoStorageDouble(), new EventPublisherDouble());

        TeamPage result = service.findPage(new TeamFilter(null, null, null, null, null, null, true), 0, 25);

        assertThat(repository.pageable.getSort().getOrderFor("rawName").isAscending()).isTrue();
        assertThat(repository.pageable.getSort().getOrderFor("id").isAscending()).isTrue();
        assertThat(result.items()).hasSize(1);
    }

    private TeamService service(RepositoryDouble repository, LogoStorageDouble storage, EventPublisherDouble publisher) {
        return new TeamService(store(repository), storage, publisher);
    }

    private JpaTeamStore store(RepositoryDouble repository) {
        return new JpaTeamStore(repository.proxy(), mapper);
    }

    private CreateTeamCommand command() {
        return new CreateTeamCommand("club-1", "Raw", "Team", "TM", "L1", 2L, "2026",
                FormatEnum.SIX, GenderEnum.M);
    }

    private TeamEntity entity(String logoUrl, boolean active, long followers) {
        return TeamEntity.builder().id(1L).clubId("club-1").rawName("Raw").name("Team").shortName("TM")
                .leagueCode("L1").divisionId(2L).season("2026").format(FormatEnum.SIX)
                .gender(GenderEnum.M).followersCount(followers).logoUrl(logoUrl).active(active)
                .createdAt(LocalDateTime.parse("2026-01-01T00:00:00"))
                .lastUpdate(LocalDateTime.parse("2026-01-02T00:00:00")).build();
    }

    private static final class RepositoryDouble implements InvocationHandler {
        private TeamEntity entity;
        private List<TeamEntity> pageItems = List.of();
        private Pageable pageable;

        TeamRepository proxy() {
            return (TeamRepository) Proxy.newProxyInstance(
                    TeamRepository.class.getClassLoader(), new Class<?>[]{TeamRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "save" -> {
                    entity = (TeamEntity) arguments[0];
                    if (entity.getId() == null) entity.setId(1L);
                    yield entity;
                }
                case "findById" -> Optional.ofNullable(entity);
                case "findFiltered" -> {
                    pageable = (Pageable) arguments[8];
                    yield new PageImpl<>(pageItems);
                }
                case "toString" -> "TeamRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }

    private static final class LogoStorageDouble implements TeamLogoStorage {
        private final List<String> deleted = new ArrayList<>();
        @Override public String upload(TeamLogoUpload upload) { return "https://uploaded"; }
        @Override public void delete(String url) { deleted.add(url); }
    }

    private static final class EventPublisherDouble implements TeamEventPublisher {
        private final List<TeamUpsertFact> published = new ArrayList<>();
        @Override public void publishUpsert(TeamUpsertFact team) { published.add(team); }
    }
}
