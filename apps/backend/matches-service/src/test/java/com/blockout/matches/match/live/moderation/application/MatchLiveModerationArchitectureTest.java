package com.blockout.matches.match.live.moderation.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.match.live.moderation.persistence.JpaMatchLiveModerationStore;
import com.blockout.matches.match.live.moderation.persistence.MatchLiveModerationPersistenceMapper;
import com.blockout.matches.match.live.report.application.MatchLiveLinkReportApplicationService;
import com.blockout.matches.match.live.report.application.MatchLiveLinkReportPolicy;
import com.blockout.matches.match.live.report.application.MatchLiveLinkReportStore;
import com.blockout.matches.match.live.report.application.ReportMatchLiveLinkCommand;
import com.blockout.matches.match.live.report.persistence.JpaMatchLiveLinkReportStore;
import com.blockout.matches.match.live.report.persistence.MatchLiveLinkReport;
import com.blockout.matches.match.live.report.persistence.MatchLiveLinkReportPersistenceMapper;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

class MatchLiveModerationArchitectureTest {

    @Test
    void moderationAndReportApplicationTypesUseOnlyTheirOwnedCollaborators() {
        assertApplicationFields(MatchLiveModerationApplicationService.class, "moderation.application");
        assertApplicationFields(MatchLiveModerationPolicy.class, "moderation.application");
        assertApplicationFields(MatchLiveModerationProjector.class, "moderation.application");
        assertApplicationFields(MatchLiveLinkReportApplicationService.class, "report.application");
        assertApplicationFields(MatchLiveLinkReportPolicy.class, "report.application");
    }

    @Test
    void persistenceEntityStoresAndMappersStayInsideTheirOwningAdapters() {
        assertThat(MatchLiveLinkReport.class.getPackageName())
                .isEqualTo("com.blockout.matches.match.live.report.persistence");
        assertThat(MatchLiveLinkReport.class.getAnnotation(Entity.class)).isNotNull();
        assertThat(MatchLiveLinkReport.class.getAnnotation(Table.class).name())
                .isEqualTo("match_live_link_reports");
        assertThat(JpaMatchLiveModerationStore.class.getInterfaces())
                .containsExactly(MatchLiveModerationStore.class);
        assertThat(JpaMatchLiveLinkReportStore.class.getInterfaces())
                .containsExactly(MatchLiveLinkReportStore.class);
        assertThat(MatchLiveModerationPersistenceMapper.class.getPackageName())
                .endsWith("match.live.moderation.persistence");
        assertThat(MatchLiveLinkReportPersistenceMapper.class.getPackageName())
                .endsWith("match.live.report.persistence");
    }

    @Test
    void moderationAndReportCommandsRetainTransactionOwnership() throws NoSuchMethodException {
        Transactional moderation = MatchLiveModerationApplicationService.class
                .getMethod("moderate", ModerateMatchLiveLinkCommand.class)
                .getAnnotation(Transactional.class);
        Transactional report = MatchLiveLinkReportApplicationService.class
                .getMethod("report", Long.class, ReportMatchLiveLinkCommand.class)
                .getAnnotation(Transactional.class);
        Transactional page = MatchLiveModerationApplicationService.class
                .getMethod("findPage", MatchLiveModerationQuery.class)
                .getAnnotation(Transactional.class);

        assertThat(moderation).isNotNull();
        assertThat(report).isNotNull();
        assertThat(page).isNotNull();
        assertThat(page.readOnly()).isTrue();
    }

    private void assertApplicationFields(Class<?> type, String ownedPackageSuffix) {
        assertThat(Arrays.stream(type.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()))
                .map(field -> field.getType().getPackageName()))
                .allMatch(packageName -> packageName.endsWith(ownedPackageSuffix)
                        || packageName.equals("java.time"));
    }
}
