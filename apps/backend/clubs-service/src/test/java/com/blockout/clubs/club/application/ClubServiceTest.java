package com.blockout.clubs.club.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.clubs.club.domain.ClubLogoUpload;
import com.blockout.clubs.club.persistence.ClubEntity;
import com.blockout.clubs.club.persistence.ClubPersistenceMapper;
import com.blockout.clubs.club.persistence.ClubRepository;
import com.blockout.clubs.club.persistence.JpaClubStore;
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

class ClubServiceTest {

    private final ClubPersistenceMapper mapper = Mappers.getMapper(ClubPersistenceMapper.class);

    @Test
    void createKeepsTheCurrentDroppedAddressBehaviorAndPublishesTheSavedProjection() {
        RepositoryDouble repository = new RepositoryDouble();
        LogoStorageDouble logoStorage = new LogoStorageDouble();
        EventPublisherDouble eventPublisher = new EventPublisherDouble();
        ClubService service = service(repository, logoStorage, eventPublisher);
        CreateClubCommand command = new CreateClubCommand(
                "club-1", "Raw", "Club", "Paris", "75001", "mail@example.test", "0102", "https://club");
        ClubLogoUpload upload = new ClubLogoUpload("logo.png", "image/png", new byte[]{1});

        ClubView result = service.create(command, upload);

        assertThat(result.address()).isNull();
        assertThat(result.logoUrl()).isEqualTo("https://uploaded-logo");
        assertThat(result.active()).isTrue();
        assertThat(eventPublisher.published).containsExactly(ClubUpsertFact.from(result));
    }

    @Test
    void updatePreservesNullFieldsKeepsTheLogoAndReactivates() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = entity("old-logo", false);
        LogoStorageDouble logoStorage = new LogoStorageDouble();
        EventPublisherDouble eventPublisher = new EventPublisherDouble();
        ClubService service = service(repository, logoStorage, eventPublisher);

        ClubView result = service.update("club-1", new UpdateClubCommand(
                null, "Updated", null, null, null, null, null, null), ClubLogoChange.keep());

        assertThat(result.rawName()).isEqualTo("Raw");
        assertThat(result.name()).isEqualTo("Updated");
        assertThat(result.logoUrl()).isEqualTo("old-logo");
        assertThat(result.active()).isTrue();
        assertThat(logoStorage.deleted).isEmpty();
        assertThat(eventPublisher.published).containsExactly(ClubUpsertFact.from(result));
    }

    @Test
    void explicitLogoRemovalDeletesTheOwnedObjectAndClearsTheUrl() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.entity = entity("https://logo", true);
        LogoStorageDouble logoStorage = new LogoStorageDouble();
        ClubService service = service(repository, logoStorage, new EventPublisherDouble());

        ClubView result = service.update("club-1", new UpdateClubCommand(
                null, null, null, null, null, null, null, null), ClubLogoChange.remove());

        assertThat(logoStorage.deleted).containsExactly("https://logo");
        assertThat(result.logoUrl()).isNull();
    }

    @Test
    void canonicalPageUsesStableNameAndIdentifierOrdering() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.pageItems = List.of(entity(null, true));
        ClubService service = service(repository, new LogoStorageDouble(), new EventPublisherDouble());

        ClubPage result = service.findPage(null, true, 0, 25);

        assertThat(repository.pageable.getSort().getOrderFor("name").isAscending()).isTrue();
        assertThat(repository.pageable.getSort().getOrderFor("id").isAscending()).isTrue();
        assertThat(result.items()).hasSize(1);
        assertThat(result.totalItems()).isEqualTo(1);
    }

    private ClubService service(
            RepositoryDouble repository,
            LogoStorageDouble logoStorage,
            EventPublisherDouble eventPublisher) {
        return new ClubService(new JpaClubStore(repository.proxy(), mapper), logoStorage, eventPublisher);
    }

    private ClubEntity entity(String logoUrl, boolean active) {
        return ClubEntity.builder()
                .id("club-1")
                .rawName("Raw")
                .name("Club")
                .address("1 rue")
                .city("Paris")
                .postalCode("75001")
                .email("mail@example.test")
                .phoneNumber("0102")
                .website("https://club")
                .logoUrl(logoUrl)
                .active(active)
                .createdAt(LocalDateTime.parse("2026-01-01T00:00:00"))
                .lastUpdate(LocalDateTime.parse("2026-01-02T00:00:00"))
                .build();
    }

    private static final class RepositoryDouble implements InvocationHandler {

        private ClubEntity entity;
        private List<ClubEntity> pageItems = List.of();
        private Pageable pageable;

        ClubRepository proxy() {
            return (ClubRepository) Proxy.newProxyInstance(
                    ClubRepository.class.getClassLoader(), new Class<?>[]{ClubRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "save" -> {
                    entity = (ClubEntity) arguments[0];
                    yield entity;
                }
                case "findById" -> Optional.ofNullable(entity);
                case "findFiltered" -> {
                    pageable = (Pageable) arguments[3];
                    yield new PageImpl<>(pageItems);
                }
                case "findFilteredLegacy" -> pageItems;
                case "toString" -> "ClubRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }

    private static final class LogoStorageDouble implements ClubLogoStorage {

        private final List<String> deleted = new ArrayList<>();

        @Override
        public String upload(ClubLogoUpload upload) {
            return "https://uploaded-logo";
        }

        @Override
        public void delete(String url) {
            deleted.add(url);
        }
    }

    private static final class EventPublisherDouble implements ClubEventPublisher {

        private final List<ClubUpsertFact> published = new ArrayList<>();

        @Override
        public void publishUpsert(ClubUpsertFact club) {
            published.add(club);
        }
    }
}
