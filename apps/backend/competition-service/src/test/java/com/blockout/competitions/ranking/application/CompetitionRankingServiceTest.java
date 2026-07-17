package com.blockout.competitions.ranking.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.competitions.association.persistence.CompetitionAssociationEntity;
import com.blockout.competitions.association.persistence.CompetitionAssociationRepository;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class CompetitionRankingServiceTest {

    @Test
    void pagesPoolGroupsAndKeepsEveryNestedRankingCompleteAndOrdered() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.teamAssociations = List.of(
                association(30L, 300L, 0, 0, 0, 0, 0),
                association(10L, 102L, 0, 0, 0, 0, 0),
                association(20L, 200L, 0, 0, 0, 0, 0),
                association(10L, 101L, 0, 0, 0, 0, 0));
        repository.poolAssociations = List.of(
                association(20L, 202L, 5, 0, 1, 1, 1),
                association(10L, 102L, 7, 0, 2, 1, 1),
                association(10L, 101L, 7, 0, 2, 1, 1),
                association(20L, 201L, 6, 0, 1, 1, 1));

        PoolRankingPage result = service(repository).findPageByTeam(99L, 0, 2);

        assertThat(result.items()).extracting(PoolRankingView::poolId).containsExactly(10L, 20L);
        assertThat(result.items().getFirst().ranking()).extracting(TeamRankingView::teamId)
                .containsExactly(101L, 102L);
        assertThat(result.items().get(1).ranking()).extracting(TeamRankingView::teamId)
                .containsExactly(201L, 202L);
        assertThat(result.page()).isZero();
        assertThat(result.pageSize()).isEqualTo(2);
        assertThat(result.totalItems()).isEqualTo(3);
        assertThat(result.hasNext()).isTrue();
        assertThat(result.items()).isUnmodifiable();
        assertThat(repository.requestedPoolIds).containsExactlyInAnyOrder(10L, 20L);
    }

    @Test
    void returnsAnEmptyStablePageWithoutFetchingRankingsPastTheLastPool() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.teamAssociations = List.of(association(10L, 101L, 0, 0, 0, 0, 0));

        PoolRankingPage result = service(repository).findPageByTeam(99L, 1, 1);

        assertThat(result.items()).isEmpty();
        assertThat(result.totalItems()).isEqualTo(1);
        assertThat(result.hasNext()).isFalse();
        assertThat(repository.rankingFetchCount).isZero();
    }

    @Test
    void givesTheLegacyAdapterTheSameOwnerProjectionAndDeterministicTieOrder() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.teamAssociations = List.of(
                association(20L, 200L, 0, 0, 0, 0, 0),
                association(10L, 100L, 0, 0, 0, 0, 0));
        repository.poolAssociations = List.of(
                association(20L, 202L, 1, 0, 0, 0, 0),
                association(10L, 102L, 1, 0, 0, 0, 0),
                association(10L, 101L, 1, 0, 0, 0, 0));

        List<PoolRankingView> result = service(repository).findLegacyByTeam(99L);

        assertThat(result).extracting(PoolRankingView::poolId).containsExactly(10L, 20L);
        assertThat(result.getFirst().ranking()).extracting(TeamRankingView::teamId)
                .containsExactly(101L, 102L);
    }

    private CompetitionRankingService service(RepositoryDouble repository) {
        return new CompetitionRankingService(repository.proxy(), new CompetitionRankingPolicy());
    }

    private CompetitionAssociationEntity association(
            long poolId,
            long teamId,
            int points,
            int pointsPenalty,
            int wins,
            double coefSets,
            double coefPoints) {
        return CompetitionAssociationEntity.builder()
                .id(teamId)
                .poolId(poolId)
                .teamId(teamId)
                .clubId("club-1")
                .active(true)
                .points(points)
                .pointsPenalty(pointsPenalty)
                .played(wins)
                .wins(wins)
                .losses(0)
                .coefSets(coefSets)
                .coefPoints(coefPoints)
                .build();
    }

    private static final class RepositoryDouble implements InvocationHandler {
        private List<CompetitionAssociationEntity> teamAssociations = List.of();
        private List<CompetitionAssociationEntity> poolAssociations = List.of();
        private Set<Long> requestedPoolIds = Set.of();
        private int rankingFetchCount;

        CompetitionAssociationRepository proxy() {
            return (CompetitionAssociationRepository) Proxy.newProxyInstance(
                    CompetitionAssociationRepository.class.getClassLoader(),
                    new Class<?>[]{CompetitionAssociationRepository.class},
                    this);
        }

        @Override
        @SuppressWarnings("unchecked")
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findByTeamIdAndActive" -> teamAssociations;
                case "findByActiveTrueAndPoolIdIn" -> {
                    requestedPoolIds = (Set<Long>) arguments[0];
                    rankingFetchCount++;
                    yield poolAssociations.stream()
                            .filter(association -> requestedPoolIds.contains(association.getPoolId()))
                            .toList();
                }
                case "toString" -> "CompetitionAssociationRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }
}
