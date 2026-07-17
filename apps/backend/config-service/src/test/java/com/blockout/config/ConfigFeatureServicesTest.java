package com.blockout.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.config.appstatus.application.AppStatusService;
import com.blockout.config.appstatus.application.UpdateAppStatusCommand;
import com.blockout.config.appstatus.persistence.AppStatusEntity;
import com.blockout.config.appstatus.persistence.AppStatusPersistenceMapper;
import com.blockout.config.appstatus.persistence.AppStatusRepository;
import com.blockout.config.division.application.DivisionLogoStorage;
import com.blockout.config.division.application.DivisionLogoUpload;
import com.blockout.config.division.application.DivisionService;
import com.blockout.config.division.application.UpdateDivisionCommand;
import com.blockout.config.division.persistence.DivisionEntity;
import com.blockout.config.division.persistence.DivisionPersistenceMapper;
import com.blockout.config.division.persistence.DivisionRepository;
import com.blockout.config.rawmapping.application.RawDivisionMappingService;
import com.blockout.config.rawmapping.application.UpdateRawDivisionMappingCommand;
import com.blockout.config.rawmapping.persistence.RawDivisionMappingEntity;
import com.blockout.config.rawmapping.persistence.RawDivisionMappingPersistenceMapper;
import com.blockout.config.rawmapping.persistence.RawDivisionMappingRepository;
import com.blockout.config.scraperstatus.application.ScraperStatusService;
import com.blockout.config.scraperstatus.persistence.ScraperStatusEntity;
import com.blockout.config.scraperstatus.persistence.ScraperStatusPersistenceMapper;
import com.blockout.config.scraperstatus.persistence.ScraperStatusRepository;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.ScraperNameEnum;
import java.lang.reflect.Proxy;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class ConfigFeatureServicesTest {

    @Test
    void appStatusNullFieldsPreserveStoredValues() {
        AppStatusEntity entity = AppStatusEntity.builder()
                .id(1L)
                .maintenance(false)
                .message("Existing")
                .imageUrl("https://image")
                .build();
        AppStatusRepository repository = repository(
                AppStatusRepository.class,
                (method, arguments) -> switch (method) {
                    case "findFirstByOrderByIdAsc" -> Optional.of(entity);
                    case "save" -> arguments[0];
                    default -> unsupported(method);
                });
        AppStatusService service = new AppStatusService(
                repository, Mappers.getMapper(AppStatusPersistenceMapper.class));

        var updated = service.update(new UpdateAppStatusCommand(
                true, null, null, "2.0", null, null, null, null));

        assertThat(updated.maintenance()).isTrue();
        assertThat(updated.message()).isEqualTo("Existing");
        assertThat(updated.imageUrl()).isEqualTo("https://image");
        assertThat(updated.minVersionIos()).isEqualTo("2.0");
    }

    @Test
    void divisionPartialUpdateReplacesLogoAndReactivates() {
        DivisionEntity entity = DivisionEntity.builder()
                .id(7L)
                .name("Elite")
                .mainColor("#111")
                .firstGradientColor("#222")
                .secondGradientColor("#333")
                .thirdGradientColor("#444")
                .logoUrl("https://old")
                .active(false)
                .build();
        DivisionRepository repository = repository(
                DivisionRepository.class,
                (method, arguments) -> switch (method) {
                    case "findById" -> Optional.of(entity);
                    case "save" -> arguments[0];
                    default -> unsupported(method);
                });
        AtomicReference<String> deleted = new AtomicReference<>();
        DivisionLogoStorage storage = new DivisionLogoStorage() {
            @Override
            public String upload(DivisionLogoUpload image) {
                return "https://new";
            }

            @Override
            public void delete(String url) {
                deleted.set(url);
            }
        };
        DivisionService service = new DivisionService(
                repository, Mappers.getMapper(DivisionPersistenceMapper.class), storage);

        var updated = service.update(
                7L,
                new UpdateDivisionCommand(null, "#999", null, null, null),
                new DivisionLogoUpload("logo.png", "image/png", new byte[] {1}));

        assertThat(updated.name()).isEqualTo("Elite");
        assertThat(updated.mainColor()).isEqualTo("#999");
        assertThat(updated.active()).isTrue();
        assertThat(updated.logoUrl()).isEqualTo("https://new");
        assertThat(deleted).hasValue("https://old");
    }

    @Test
    void rawMappingUpdateKeepsExplicitNullUnmapping() {
        RawDivisionMappingEntity entity = RawDivisionMappingEntity.builder()
                .id(9L)
                .rawDivisionName("D1")
                .divisionId(7L)
                .format(FormatEnum.SIX)
                .gender(GenderEnum.M)
                .leagueCode("LNV")
                .season("2026")
                .build();
        RawDivisionMappingRepository repository = repository(
                RawDivisionMappingRepository.class,
                (method, arguments) -> switch (method) {
                    case "findById" -> Optional.of(entity);
                    case "save" -> arguments[0];
                    default -> unsupported(method);
                });
        RawDivisionMappingService service = new RawDivisionMappingService(
                repository, Mappers.getMapper(RawDivisionMappingPersistenceMapper.class));

        var updated = service.update(9L, new UpdateRawDivisionMappingCommand(null, null, null));

        assertThat(updated.divisionId()).isNull();
        assertThat(updated.format()).isNull();
        assertThat(updated.gender()).isNull();
        assertThat(updated.rawDivisionName()).isEqualTo("D1");
    }

    @Test
    void missingScraperStatusIsUpserted() {
        AtomicReference<ScraperStatusEntity> saved = new AtomicReference<>();
        ScraperStatusRepository repository = repository(
                ScraperStatusRepository.class,
                (method, arguments) -> switch (method) {
                    case "findByName" -> Optional.empty();
                    case "save" -> {
                        saved.set((ScraperStatusEntity) arguments[0]);
                        yield arguments[0];
                    }
                    default -> unsupported(method);
                });
        ScraperStatusService service = new ScraperStatusService(
                repository, Mappers.getMapper(ScraperStatusPersistenceMapper.class));

        var updated = service.update(ScraperNameEnum.SCRAPER_CLUBS, true);

        assertThat(updated.name()).isEqualTo(ScraperNameEnum.SCRAPER_CLUBS);
        assertThat(updated.enabled()).isTrue();
        assertThat(saved.get().isEnabled()).isTrue();
    }

    @SuppressWarnings("unchecked")
    private <T> T repository(Class<T> type, RepositoryInvocation invocation) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] {type},
                (proxy, method, arguments) -> invocation.invoke(method.getName(), arguments));
    }

    private Object unsupported(String method) {
        throw new UnsupportedOperationException(method);
    }

    @FunctionalInterface
    private interface RepositoryInvocation {
        Object invoke(String method, Object[] arguments);
    }
}
