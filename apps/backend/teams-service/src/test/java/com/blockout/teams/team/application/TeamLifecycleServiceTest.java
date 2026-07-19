package com.blockout.teams.team.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.teams.team.persistence.JpaTeamStore;
import com.blockout.teams.team.persistence.TeamEntity;
import com.blockout.teams.team.persistence.TeamPersistenceMapper;
import com.blockout.teams.team.persistence.TeamRepository;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class TeamLifecycleServiceTest {

    private final TeamPersistenceMapper mapper = Mappers.getMapper(TeamPersistenceMapper.class);

    @Test
    void repeatedDirectDeactivationIsASuccessfulNoOpWithoutAnotherWrite() {
        RepositoryDouble repository = new RepositoryDouble(List.of(team(1L, "club-1", false)));
        EventPublisherDouble publisher = new EventPublisherDouble();
        TeamLifecycleService service = service(repository, publisher);

        service.deactivate(1L);

        assertThat(repository.saveCalls).isZero();
        assertThat(publisher.projections).isEmpty();
    }

    @Test
    void effectiveDirectDeactivationPublishesTheInactivePostFlushRevision() {
        RepositoryDouble repository = new RepositoryDouble(List.of(team(1L, "club-1", true)));
        EventPublisherDouble publisher = new EventPublisherDouble();
        TeamLifecycleService service = service(repository, publisher);

        service.deactivate(1L);

        assertThat(repository.saveCalls).isOne();
        assertThat(publisher.projections).containsExactly(new TeamEventData(
                1L, "Team 1", "T1", "club-1", 2L, FormatEnum.SIX, GenderEnum.M,
                "2026", null, false, 4L));
    }

    @Test
    void clubCascadePublishesOnlyTeamsThatWereStillActive() {
        RepositoryDouble repository = new RepositoryDouble(List.of(
                team(1L, "club-1", true),
                team(2L, "club-1", false),
                team(3L, "club-1", true),
                team(4L, "club-2", true)));
        EventPublisherDouble publisher = new EventPublisherDouble();
        TeamLifecycleService service = service(repository, publisher);

        service.deactivateByClubId("club-1");
        service.deactivateByClubId("club-1");

        assertThat(repository.saveCalls).isEqualTo(2);
        assertThat(publisher.projections).extracting(TeamEventData::id).containsExactly(1L, 3L);
        assertThat(publisher.projections).allSatisfy(event -> {
            assertThat(event.active()).isFalse();
            assertThat(event.revision()).isEqualTo(4L);
        });
    }

    private TeamLifecycleService service(RepositoryDouble repository, EventPublisherDouble publisher) {
        return new TeamLifecycleService(new JpaTeamStore(repository.proxy(), mapper), publisher);
    }

    private TeamEntity team(Long id, String clubId, boolean active) {
        return TeamEntity.builder()
                .id(id)
                .clubId(clubId)
                .rawName("Raw " + id)
                .name("Team " + id)
                .shortName("T" + id)
                .leagueCode("L1")
                .divisionId(2L)
                .season("2026")
                .format(FormatEnum.SIX)
                .gender(GenderEnum.M)
                .followersCount(0L)
                .active(active)
                .revision(3L)
                .build();
    }

    private static final class RepositoryDouble implements InvocationHandler {
        private final List<TeamEntity> entities;
        private int saveCalls;

        private RepositoryDouble(List<TeamEntity> entities) {
            this.entities = new ArrayList<>(entities);
        }

        TeamRepository proxy() {
            return (TeamRepository) Proxy.newProxyInstance(
                    TeamRepository.class.getClassLoader(), new Class<?>[]{TeamRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findById" -> entities.stream().filter(entity -> entity.getId().equals(arguments[0])).findFirst();
                case "findByClubIdAndActiveTrue" -> entities.stream()
                        .filter(entity -> entity.getClubId().equals(arguments[0]) && Boolean.TRUE.equals(entity.getActive()))
                        .toList();
                case "save", "saveAndFlush" -> {
                    saveCalls++;
                    TeamEntity entity = (TeamEntity) arguments[0];
                    entity.setRevision(entity.getRevision() + 1);
                    yield entity;
                }
                case "toString" -> "TeamRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }

    private static final class EventPublisherDouble implements TeamEventPublisher {
        private final List<TeamEventData> projections = new ArrayList<>();

        @Override
        public void publishUpsert(TeamEventData team) {
        }

        @Override
        public void publishProjection(TeamEventData team) {
            projections.add(team);
        }
    }
}
