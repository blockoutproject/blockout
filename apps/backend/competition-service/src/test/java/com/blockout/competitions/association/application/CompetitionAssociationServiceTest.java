package com.blockout.competitions.association.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.competitions.association.persistence.CompetitionAssociationEntity;
import com.blockout.competitions.association.persistence.CompetitionAssociationPersistenceMapper;
import com.blockout.competitions.association.persistence.CompetitionAssociationRepository;
import com.blockout.competitions.exceptions.CompetitionAssociationNotFoundException;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class CompetitionAssociationServiceTest {

    private final CompetitionAssociationPersistenceMapper mapper =
            Mappers.getMapper(CompetitionAssociationPersistenceMapper.class);

    @Test
    void createsAnOwnedZeroStatisticsAssociation() {
        RepositoryDouble repository = new RepositoryDouble();

        CompetitionAssociationView created = service(repository).addOrReactivate(
                new AddCompetitionAssociationCommand(10L, 20L, "club-1"));

        assertThat(created.poolId()).isEqualTo(10L);
        assertThat(created.teamId()).isEqualTo(20L);
        assertThat(created.clubId()).isEqualTo("club-1");
        assertThat(created.active()).isTrue();
        assertThat(List.of(created.points(), created.played(), created.wins(), created.losses(),
                created.winsThreeToZero(), created.winsThreeToOne(), created.winsThreeToTwo(),
                created.lossesZeroToThree(), created.lossesOneToThree(), created.lossesTwoToThree(),
                created.wonSets(), created.lostSets(), created.wonPoints(), created.lostPoints(),
                created.pointsPenalty())).containsOnly(0);
        assertThat(created.coefSets()).isZero();
        assertThat(created.coefPoints()).isZero();
    }

    @Test
    void leavesAnActiveAssociationAndStoredClubIdentityUntouched() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = association(true, "stored-club", 9);

        CompetitionAssociationView result = service(repository).addOrReactivate(
                new AddCompetitionAssociationCommand(10L, 20L, "new-club"));

        assertThat(result.clubId()).isEqualTo("stored-club");
        assertThat(result.points()).isEqualTo(9);
        assertThat(repository.saveCount).isZero();
    }

    @Test
    void reactivatesWhilePreservingStoredClubAndHistoricalStatistics() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = association(false, "stored-club", 9);

        CompetitionAssociationView result = service(repository).addOrReactivate(
                new AddCompetitionAssociationCommand(10L, 20L, "new-club"));

        assertThat(result.active()).isTrue();
        assertThat(result.clubId()).isEqualTo("stored-club");
        assertThat(result.points()).isEqualTo(9);
        assertThat(repository.saveCount).isEqualTo(1);
    }

    @Test
    void replacesEveryStatisticsFieldAsOneSnapshot() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = association(true, "club-1", 0);

        CompetitionAssociationView result = service(repository).replaceStatistics(10L, 20L, snapshot());

        assertThat(result.played()).isEqualTo(1);
        assertThat(result.wins()).isEqualTo(2);
        assertThat(result.losses()).isEqualTo(3);
        assertThat(result.points()).isEqualTo(4);
        assertThat(result.winsThreeToZero()).isEqualTo(5);
        assertThat(result.lossesTwoToThree()).isEqualTo(10);
        assertThat(result.wonPoints()).isEqualTo(13);
        assertThat(result.pointsPenalty()).isEqualTo(15);
        assertThat(result.coefSets()).isEqualTo(16.5);
        assertThat(result.coefPoints()).isEqualTo(17.5);
        assertThat(result.poolId()).isEqualTo(10L);
        assertThat(result.teamId()).isEqualTo(20L);
        assertThat(result.clubId()).isEqualTo("club-1");
        assertThat(result.active()).isTrue();
    }

    @Test
    void doesNotTurnANullLegacyStatisticIntoAPartialMerge() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = association(true, "club-1", 9);
        CompetitionStatisticsSnapshot snapshot = new CompetitionStatisticsSnapshot(
                null, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16.5, 17.5);

        CompetitionAssociationView result = service(repository).replaceStatistics(10L, 20L, snapshot);

        assertThat(result.played()).isNull();
        assertThat(result.points()).isEqualTo(4);
    }

    @Test
    void preservesTheStableOwnerOrderingForPoolPages() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.pageItems = List.of(association(true, "club-1", 0));
        repository.totalItems = 2;

        CompetitionAssociationPage result = service(repository).findPageByPool(10L, 0, 1);

        assertThat(result.totalItems()).isEqualTo(2);
        assertThat(result.hasNext()).isTrue();
        assertThat(result.items()).hasSize(1).isUnmodifiable();
        assertThat(repository.pageable.getSort().getOrderFor("teamId").isAscending()).isTrue();
    }

    @Test
    void reportsAStableNotFoundFailureForAnUnknownStatisticsAssociation() {
        RepositoryDouble repository = new RepositoryDouble();

        assertThatThrownBy(() -> service(repository).replaceStatistics(10L, 20L, snapshot()))
                .isInstanceOf(CompetitionAssociationNotFoundException.class);
    }

    private CompetitionAssociationService service(RepositoryDouble repository) {
        return new CompetitionAssociationService(repository.proxy(), mapper);
    }

    private CompetitionAssociationEntity association(boolean active, String clubId, int points) {
        return CompetitionAssociationEntity.builder()
                .id(1L)
                .poolId(10L)
                .teamId(20L)
                .clubId(clubId)
                .active(active)
                .points(points)
                .build();
    }

    private CompetitionStatisticsSnapshot snapshot() {
        return new CompetitionStatisticsSnapshot(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16.5, 17.5);
    }

    private static final class RepositoryDouble implements InvocationHandler {
        private CompetitionAssociationEntity entity;
        private List<CompetitionAssociationEntity> pageItems = List.of();
        private long totalItems;
        private Pageable pageable;
        private int saveCount;

        CompetitionAssociationRepository proxy() {
            return (CompetitionAssociationRepository) Proxy.newProxyInstance(
                    CompetitionAssociationRepository.class.getClassLoader(),
                    new Class<?>[]{CompetitionAssociationRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findByPoolIdAndTeamId" -> Optional.ofNullable(entity);
                case "save" -> {
                    entity = (CompetitionAssociationEntity) arguments[0];
                    if (entity.getId() == null) {
                        entity.setId(1L);
                    }
                    saveCount++;
                    yield entity;
                }
                case "findByPoolIdAndActiveTrue", "findByTeamIdAndActiveTrue" -> {
                    pageable = (Pageable) arguments[1];
                    yield new PageImpl<>(pageItems, pageable, totalItems);
                }
                case "toString" -> "CompetitionAssociationRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }
}
