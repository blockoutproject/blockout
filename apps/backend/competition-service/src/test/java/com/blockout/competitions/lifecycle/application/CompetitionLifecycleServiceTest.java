package com.blockout.competitions.lifecycle.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.competitions.association.persistence.CompetitionAssociationEntity;
import com.blockout.competitions.association.persistence.CompetitionAssociationPersistenceMapper;
import com.blockout.competitions.association.persistence.CompetitionAssociationRepository;
import com.blockout.competitions.lifecycle.persistence.JpaCompetitionLifecycleStore;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.transaction.annotation.Transactional;

class CompetitionLifecycleServiceTest {

    private final CompetitionAssociationPersistenceMapper mapper =
            Mappers.getMapper(CompetitionAssociationPersistenceMapper.class);

    @Test
    void commandsOwnDefensiveSetSnapshotsAndDuplicateSemantics() {
        Set<Long> teamIds = new HashSet<>(List.of(20L, 20L));
        DeactivateCompetitionTeamsCommand teams = new DeactivateCompetitionTeamsCommand(10L, teamIds);
        teamIds.add(30L);

        assertThat(teams.teamIds()).containsExactly(20L).isUnmodifiable();
        assertThat(new DeactivateCompetitionPoolsCommand(Set.of(10L)).poolIds()).isUnmodifiable();
        assertThat(new DeactivateCompetitionClubsCommand(Set.of("club-1")).clubIds()).isUnmodifiable();
    }

    @Test
    void zeroAssociationCommandsReturnWithoutWritesEventsOrCascadeQueries() {
        RepositoryDouble repository = new RepositoryDouble();
        EventDouble events = new EventDouble();
        CompetitionLifecycleService service = service(repository, events);

        service.bulkDeactivateTeamsByPool(new DeactivateCompetitionTeamsCommand(10L, Set.of()));
        service.bulkDeactivatePools(new DeactivateCompetitionPoolsCommand(Set.of()));
        service.bulkDeactivateClubs(new DeactivateCompetitionClubsCommand(Set.of()));

        assertThat(repository.saveCount).isZero();
        assertThat(repository.existenceCheckCount).isZero();
        assertThat(repository.distinctQueryCount).isZero();
        assertThat(events.published).isEmpty();
    }

    @Test
    void deactivatesPoolTeamRowsThenPublishesTheExistingCascade() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.teamAssociations = List.of(
                association(10L, 20L, "club-1"),
                association(10L, 30L, "club-1"));
        repository.distinctClubIds = List.of("club-1");
        EventDouble events = new EventDouble();

        service(repository, events).bulkDeactivateTeamsByPool(
                new DeactivateCompetitionTeamsCommand(10L, Set.of(20L, 30L)));

        assertThat(repository.teamAssociations).extracting(CompetitionAssociationEntity::getActive)
                .containsOnly(false);
        assertThat(repository.saveCount).isEqualTo(1);
        assertThat(events.published).containsExactlyInAnyOrder(
                "team-pool:20:10",
                "team-pool:30:10",
                "pool:10",
                "team:20",
                "team:30",
                "club:club-1");
        assertThat(events.published.subList(0, 2)).allMatch(event -> event.startsWith("team-pool:"));
    }

    @Test
    void preservesMixedPoolCandidateCascadeIncludingAnIdentifierWithoutRows() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.poolAssociations = List.of(association(10L, 20L, "club-1"));
        repository.distinctClubIds = List.of("club-1");
        EventDouble events = new EventDouble();

        service(repository, events).bulkDeactivatePools(new DeactivateCompetitionPoolsCommand(Set.of(10L, 99L)));

        assertThat(repository.poolAssociations.getFirst().getActive()).isFalse();
        assertThat(events.published).containsExactlyInAnyOrder(
                "pool:10", "pool:99", "team:20", "club:club-1");
    }

    @Test
    void preservesMixedClubCandidateCascadeWithoutInventingASecondAssociation() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.clubAssociations = List.of(association(10L, 20L, "club-1"));
        EventDouble events = new EventDouble();

        service(repository, events).bulkDeactivateClubs(
                new DeactivateCompetitionClubsCommand(Set.of("club-1", "club-without-row")));

        assertThat(repository.clubAssociations.getFirst().getActive()).isFalse();
        assertThat(events.published).containsExactlyInAnyOrder(
                "pool:10", "team:20", "club:club-1", "club:club-without-row");
    }

    @Test
    void suppressesCascadeEventsWhileAnActiveAssociationStillOwnsEachIdentity() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.activePoolIds = Set.of(10L);
        repository.activeTeamIds = Set.of(20L);
        repository.activeClubIds = Set.of("club-1");
        EventDouble events = new EventDouble();
        CompetitionLifecycleStore store = store(repository);
        CompetitionCascadeService cascade = new CompetitionCascadeService(store, events);

        cascade.execute(new CompetitionCascadePlan(Set.of(10L), Set.of(20L), Set.of("club-1")));

        assertThat(events.published).isEmpty();
    }

    @Test
    void keepsCommandsTransactionalAndPropagatesPublisherFailuresForRollback() throws Exception {
        assertThat(CompetitionLifecycleService.class
                .getMethod("bulkDeactivateTeamsByPool", DeactivateCompetitionTeamsCommand.class)
                .getAnnotation(Transactional.class)).isNotNull();
        assertThat(CompetitionLifecycleService.class
                .getMethod("bulkDeactivatePools", DeactivateCompetitionPoolsCommand.class)
                .getAnnotation(Transactional.class)).isNotNull();
        assertThat(CompetitionLifecycleService.class
                .getMethod("bulkDeactivateClubs", DeactivateCompetitionClubsCommand.class)
                .getAnnotation(Transactional.class)).isNotNull();

        RepositoryDouble repository = new RepositoryDouble();
        repository.teamAssociations = List.of(association(10L, 20L, "club-1"));
        EventDouble events = new EventDouble();
        events.failOn = "team-pool:20:10";

        assertThatThrownBy(() -> service(repository, events).bulkDeactivateTeamsByPool(
                new DeactivateCompetitionTeamsCommand(10L, Set.of(20L))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("publisher failure");
        assertThat(repository.saveCount).isEqualTo(1);
        assertThat(repository.existenceCheckCount).isZero();
    }

    private CompetitionLifecycleService service(RepositoryDouble repository, EventDouble events) {
        CompetitionLifecycleStore store = store(repository);
        return new CompetitionLifecycleService(store, events, new CompetitionCascadeService(store, events));
    }

    private CompetitionLifecycleStore store(RepositoryDouble repository) {
        return new JpaCompetitionLifecycleStore(repository.proxy(), mapper);
    }

    private CompetitionAssociationEntity association(long poolId, long teamId, String clubId) {
        return CompetitionAssociationEntity.builder()
                .id(teamId)
                .poolId(poolId)
                .teamId(teamId)
                .clubId(clubId)
                .active(true)
                .build();
    }

    private static final class EventDouble implements CompetitionLifecycleEvents {
        private final List<String> published = new ArrayList<>();
        private String failOn;

        @Override
        public void publishTeamDeactivation(Long teamId) {
            publish("team:" + teamId);
        }

        @Override
        public void publishPoolDeactivation(Long poolId) {
            publish("pool:" + poolId);
        }

        @Override
        public void publishTeamDeactivationByPool(Long teamId, Long poolId) {
            publish("team-pool:" + teamId + ":" + poolId);
        }

        @Override
        public void publishClubDeactivation(String clubId) {
            publish("club:" + clubId);
        }

        private void publish(String event) {
            if (event.equals(failOn)) {
                throw new IllegalStateException("publisher failure");
            }
            published.add(event);
        }
    }

    private static final class RepositoryDouble implements InvocationHandler {
        private List<CompetitionAssociationEntity> teamAssociations = List.of();
        private List<CompetitionAssociationEntity> poolAssociations = List.of();
        private List<CompetitionAssociationEntity> clubAssociations = List.of();
        private List<Long> distinctTeamIds = List.of();
        private List<String> distinctClubIds = List.of();
        private Set<Long> activePoolIds = Set.of();
        private Set<Long> activeTeamIds = Set.of();
        private Set<String> activeClubIds = Set.of();
        private int saveCount;
        private int existenceCheckCount;
        private int distinctQueryCount;

        CompetitionAssociationRepository proxy() {
            return (CompetitionAssociationRepository) Proxy.newProxyInstance(
                    CompetitionAssociationRepository.class.getClassLoader(),
                    new Class<?>[]{CompetitionAssociationRepository.class},
                    this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findByPoolIdAndActiveTrueAndTeamIdIn" -> teamAssociations;
                case "findByActiveTrueAndPoolIdIn" -> poolAssociations;
                case "findByActiveTrueAndClubIdIn" -> clubAssociations;
                case "saveAll" -> {
                    saveCount++;
                    yield arguments[0];
                }
                case "existsByPoolIdAndActiveTrue" -> {
                    existenceCheckCount++;
                    yield activePoolIds.contains(arguments[0]);
                }
                case "existsByTeamIdAndActiveTrue" -> {
                    existenceCheckCount++;
                    yield activeTeamIds.contains(arguments[0]);
                }
                case "existsByClubIdAndActiveTrue" -> {
                    existenceCheckCount++;
                    yield activeClubIds.contains(arguments[0]);
                }
                case "findDistinctTeamIdByActiveTrueAndPoolIdIn" -> {
                    distinctQueryCount++;
                    yield distinctTeamIds;
                }
                case "findDistinctClubIdByActiveTrueAndTeamIdIn" -> {
                    distinctQueryCount++;
                    yield distinctClubIds;
                }
                case "toString" -> "CompetitionAssociationRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }
}
