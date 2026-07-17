package com.blockout.mobilegateway.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.mobilegateway.configuration.runtime.api.MobileConfigurationV2Controller;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationWorkflow;
import com.blockout.mobilegateway.generated.model.CreateMobileReportRequest;
import com.blockout.mobilegateway.generated.model.UpdateMobileAppStatusRequest;
import com.blockout.mobilegateway.generated.model.UpdateMobileUserRequest;
import com.blockout.mobilegateway.notification.api.MobileNotificationV2Controller;
import com.blockout.mobilegateway.notification.application.MobileNotificationGateway;
import com.blockout.mobilegateway.notification.application.MobileNotificationWorkflow;
import com.blockout.mobilegateway.report.api.MobileReportV2Controller;
import com.blockout.mobilegateway.report.application.MobileReportWorkflow;
import com.blockout.mobilegateway.search.api.MobileSearchV2Controller;
import com.blockout.mobilegateway.search.application.MobileSearchGateway;
import com.blockout.mobilegateway.search.application.MobileSearchWorkflow;
import com.blockout.mobilegateway.user.api.MobileUserV2Controller;
import com.blockout.mobilegateway.user.application.MobileUserGateway;
import com.blockout.mobilegateway.user.application.MobileUserWorkflow;
import com.blockout.shared.model.EntityTypeEnum;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import com.blockout.shared.model.ReportTypeEnum;
import java.lang.reflect.Proxy;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

class CanonicalRelayControllerTest {

    @Test
    void mapsConfigurationCommandAndViewAcrossTheGeneratedBoundary() {
        var captured = new AtomicReference<MobileConfigurationWorkflow.UpdateAppStatusCommand>();
        var gateway = proxy(MobileConfigurationGateway.class, (proxy, method, arguments) -> {
            if (!method.getName().equals("updateAppStatus")) {
                throw new UnsupportedOperationException(method.getName());
            }
            captured.set((MobileConfigurationWorkflow.UpdateAppStatusCommand) arguments[0]);
            return new MobileConfigurationWorkflow.AppStatusView(
                    true, "Maintenance", null, "2.0.0", "2.1.0", "https://ios.example",
                    "https://android.example", "Update required", Instant.EPOCH);
        });
        var controller = new MobileConfigurationV2Controller(new MobileConfigurationWorkflow(gateway));
        var request = new UpdateMobileAppStatusRequest()
                .maintenance(true)
                .message("Maintenance")
                .minVersionIos("2.0.0")
                .minVersionAndroid("2.1.0");

        var response = controller.updateMobileAppStatus(request);
        var body = Objects.requireNonNull(response.getBody());

        assertThat(captured.get()).extracting(
                        MobileConfigurationWorkflow.UpdateAppStatusCommand::maintenance,
                        MobileConfigurationWorkflow.UpdateAppStatusCommand::message,
                        MobileConfigurationWorkflow.UpdateAppStatusCommand::minVersionIos,
                        MobileConfigurationWorkflow.UpdateAppStatusCommand::minVersionAndroid)
                .containsExactly(true, "Maintenance", "2.0.0", "2.1.0");
        assertThat(body.getLastUpdate()).isEqualTo(Instant.EPOCH);
        assertThat(body.getForceUpdateMessage()).isEqualTo("Update required");
    }

    @Test
    void mapsSearchFiltersAndTeamProjectionAcrossTheGeneratedBoundary() {
        var captured = new AtomicReference<MobileSearchWorkflow.Filters>();
        MobileSearchGateway gateway = new MobileSearchGateway() {
            @Override
            public List<MobileSearchWorkflow.ClubResult> clubs(String query) {
                throw new UnsupportedOperationException();
            }

            @Override
            public List<MobileSearchWorkflow.TeamResult> teams(MobileSearchWorkflow.Filters filters) {
                captured.set(filters);
                return List.of(new MobileSearchWorkflow.TeamResult(
                        42L, "Falcons", "https://cdn.example/team.png", "National", FormatEnum.SIX,
                        GenderEnum.F, "2026"));
            }

            @Override
            public List<MobileSearchWorkflow.PoolResult> pools(MobileSearchWorkflow.Filters filters) {
                throw new UnsupportedOperationException();
            }
        };
        var controller = new MobileSearchV2Controller(new MobileSearchWorkflow(gateway));

        var response = controller.searchMobileTeams("fal", "2026", 7L, FormatEnum.SIX, GenderEnum.F);
        var body = Objects.requireNonNull(response.getBody());

        assertThat(captured.get()).isEqualTo(
                new MobileSearchWorkflow.Filters("fal", "2026", 7L, FormatEnum.SIX, GenderEnum.F));
        assertThat(body.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getId()).isEqualTo(42L);
            assertThat(item.getName()).isEqualTo("Falcons");
            assertThat(item.getDivisionName()).isEqualTo("National");
        });
    }

    @Test
    void mapsReportMetadataAndMultipartBytesAcrossTheGeneratedBoundary() {
        var capturedCommand = new AtomicReference<MobileReportWorkflow.Command>();
        var capturedImages = new AtomicReference<List<com.blockout.mobilegateway.shared.application.BinaryPart>>();
        var workflow = new MobileReportWorkflow((command, images) -> {
            capturedCommand.set(command);
            capturedImages.set(images);
            return new MobileReportWorkflow.Result(343, URI.create("https://issues.example/343"), "Broken score");
        });
        var controller = new MobileReportV2Controller(workflow);
        var request = new CreateMobileReportRequest(
                        ReportTypeEnum.DATA_ERROR, "Broken score", "The displayed score is stale", "alice",
                        "match-detail", "iOS")
                .appVersion("2.0.0")
                .userId(11L)
                .deviceModel("iPhone");
        var image = new MockMultipartFile("images", "score.png", "image/png", new byte[] {1, 2, 3});

        var response = controller.createMobileReport(request, List.of(image));
        var body = Objects.requireNonNull(response.getBody());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(capturedCommand.get().type()).isEqualTo(ReportTypeEnum.DATA_ERROR);
        assertThat(capturedCommand.get().userId()).isEqualTo(11L);
        assertThat(capturedImages.get()).singleElement().satisfies(part -> {
            assertThat(part.filename()).isEqualTo("score.png");
            assertThat(part.contentType()).isEqualTo("image/png");
            assertThat(part.content()).containsExactly(1, 2, 3);
        });
        assertThat(body.getNumber()).isEqualTo(343);
        assertThat(body.getHtmlUrl()).isEqualTo(URI.create("https://issues.example/343"));
    }

    @Test
    void mapsUserUpdateIntentAndFavoritesAcrossTheGeneratedBoundary() {
        var capturedAuth0Id = new AtomicReference<String>();
        var capturedCommand = new AtomicReference<MobileUserWorkflow.UpdateCommand>();
        var gateway = proxy(MobileUserGateway.class, (proxy, method, arguments) -> {
            if (!method.getName().equals("update")) {
                throw new UnsupportedOperationException(method.getName());
            }
            capturedAuth0Id.set((String) arguments[0]);
            capturedCommand.set((MobileUserWorkflow.UpdateCommand) arguments[1]);
            return new MobileUserWorkflow.UserView(
                    11L, "auth0|alice", "alice@example.com", "Alice", URI.create("https://cdn.example/alice.png"),
                    List.of(new MobileUserWorkflow.FavoriteView(EntityTypeEnum.TEAM, 42L)));
        });
        var controller = new MobileUserV2Controller(new MobileUserWorkflow(gateway));
        var request = new UpdateMobileUserRequest(false).pseudo("Alice");

        var response = controller.updateMobileUser("auth0|alice", request, null);
        var body = Objects.requireNonNull(response.getBody());

        assertThat(capturedAuth0Id.get()).isEqualTo("auth0|alice");
        assertThat(capturedCommand.get()).isEqualTo(new MobileUserWorkflow.UpdateCommand("Alice", false));
        assertThat(body.getPictureUrl()).isEqualTo(URI.create("https://cdn.example/alice.png"));
        assertThat(body.getFavorites()).singleElement().satisfies(favorite -> {
            assertThat(favorite.getEntityType()).isEqualTo(EntityTypeEnum.TEAM);
            assertThat(favorite.getEntityId()).isEqualTo(42L);
        });
    }

    @Test
    void mapsEnrichedNotificationPageAcrossTheGeneratedBoundary() {
        MobileNotificationGateway gateway = new MobileNotificationGateway() {
            @Override
            public MobileNotificationWorkflow.PageView list(int page, int pageSize) {
                return new MobileNotificationWorkflow.PageView(List.of(new MobileNotificationWorkflow.ItemView(
                        9L, NotificationTypeEnum.GENERIC, "Kick-off", "The match starts soon", "/matches/9", 7L,
                        false, false, Instant.EPOCH, null)), page, pageSize, 21L, true);
            }

            @Override
            public long unreadCount() {
                throw new UnsupportedOperationException();
            }

            @Override
            public void markRead(Long id) {
                throw new UnsupportedOperationException();
            }

            @Override
            public void markOpened(Long id) {
                throw new UnsupportedOperationException();
            }

            @Override
            public void delete(Long id) {
                throw new UnsupportedOperationException();
            }

            @Override
            public void register(Long userId, MobileNotificationWorkflow.PushTokenCommand command) {
                throw new UnsupportedOperationException();
            }
        };
        var workflow = new MobileNotificationWorkflow(
                gateway, divisionId -> Optional.of("https://cdn.example/division-" + divisionId + ".png"));
        var controller = new MobileNotificationV2Controller(workflow);

        var response = controller.listMobileNotifications(2, 10);
        var body = Objects.requireNonNull(response.getBody());

        assertThat(body.getPageInfo().getPage()).isEqualTo(2);
        assertThat(body.getPageInfo().getTotalItems()).isEqualTo(21L);
        assertThat(body.getPageInfo().getHasNext()).isTrue();
        assertThat(body.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getId()).isEqualTo(9L);
            assertThat(item.getDivisionLogoUrl()).isEqualTo("https://cdn.example/division-7.png");
        });
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] {type}, handler);
    }
}
