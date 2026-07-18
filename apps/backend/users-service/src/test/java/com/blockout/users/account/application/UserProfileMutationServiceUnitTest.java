package com.blockout.users.account.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies retained profile mutation behavior through the account store boundary. */
@DisplayName("User profile mutation service")
class UserProfileMutationServiceUnitTest {

    @Test
    @DisplayName("keeps the picture, trims the pseudo, and reactivates the account")
    void keepsPictureTrimsPseudoAndReactivatesAccount() {
        StoreDouble store = new StoreDouble(view("old", "https://cdn.example/old.png", false));
        RecordingStorage storage = new RecordingStorage();
        UserProfileMutationService service = service(store, storage);

        UserAccountView updated = service.update(
                "auth0|owner", new UpdateUserProfileCommand("  new-name  ", UserProfileImageChange.keep()));

        assertThat(updated.pseudo()).isEqualTo("new-name");
        assertThat(updated.pictureUrl()).isEqualTo("https://cdn.example/old.png");
        assertThat(updated.active()).isTrue();
        assertThat(storage.deletedUrl).isNull();
        assertThat(storage.uploaded).isNull();
    }

    @Test
    @DisplayName("removes the stored picture explicitly")
    void removesStoredPictureExplicitly() {
        StoreDouble store = new StoreDouble(view("owner", "https://cdn.example/old.png", true));
        RecordingStorage storage = new RecordingStorage();
        UserProfileMutationService service = service(store, storage);

        UserAccountView updated = service.update(
                "auth0|owner", new UpdateUserProfileCommand(null, UserProfileImageChange.remove()));

        assertThat(updated.pictureUrl()).isNull();
        assertThat(storage.deletedUrl).isEqualTo("https://cdn.example/old.png");
        assertThat(storage.uploaded).isNull();
        assertThat(storage.calls).containsExactly("delete:https://cdn.example/old.png");
    }

    @Test
    @DisplayName("replaces the stored picture with validated bytes")
    void replacesStoredPictureWithValidatedBytes() {
        StoreDouble store = new StoreDouble(view("owner", "https://cdn.example/old.png", true));
        RecordingStorage storage = new RecordingStorage();
        UserProfileMutationService service = service(store, storage);
        UserProfileImageUpload upload = new UserProfileImageUpload("new.png", "image/png", new byte[] {1, 2, 3});

        UserAccountView updated = service.update(
                "auth0|owner", new UpdateUserProfileCommand(null, UserProfileImageChange.replace(upload)));

        assertThat(storage.deletedUrl).isEqualTo("https://cdn.example/old.png");
        assertThat(storage.uploaded).isEqualTo(upload);
        assertThat(updated.pictureUrl()).isEqualTo("https://cdn.example/new.png");
        assertThat(storage.calls).containsExactly("delete:https://cdn.example/old.png", "upload:users");
    }

    @Test
    @DisplayName("does not compensate the old object after replacement upload fails")
    void doesNotCompensateOldObjectAfterReplacementUploadFails() {
        StoreDouble store = new StoreDouble(view("owner", "https://cdn.example/old.png", true));
        RecordingStorage storage = new RecordingStorage();
        storage.failUpload = true;
        UserProfileMutationService service = service(store, storage);
        UserProfileImageUpload upload = new UserProfileImageUpload("new.png", "image/png", new byte[] {1, 2, 3});

        assertThatThrownBy(() -> service.update(
                        "auth0|owner", new UpdateUserProfileCommand(null, UserProfileImageChange.replace(upload))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("upload failure");

        assertThat(storage.calls).containsExactly("delete:https://cdn.example/old.png", "upload:users");
        assertThat(store.current.pictureUrl()).isEqualTo("https://cdn.example/old.png");
    }

    private static UserProfileMutationService service(StoreDouble store, RecordingStorage storage) {
        return new UserProfileMutationService(store, new ProfileImagePlanExecutor(storage));
    }

    private static UserAccountView view(String pseudo, String pictureUrl, boolean active) {
        Instant timestamp = Instant.parse("2026-07-01T10:00:00Z");
        return new UserAccountView(
                7L,
                "auth0|owner",
                "owner@example.com",
                pseudo,
                null,
                null,
                pictureUrl,
                null,
                active,
                timestamp,
                timestamp,
                List.of());
    }

    /** Implements only the role-owned store behavior exercised by profile mutation. */
    private static final class StoreDouble implements UserAccountStore, UserAccountUpdate {

        private UserAccountView current;

        private StoreDouble(UserAccountView current) {
            this.current = current;
        }

        @Override
        public Optional<UserAccountView> findByAuth0Id(String auth0Id) {
            return Optional.of(current);
        }

        @Override
        public Optional<UserAccountUpdate> findForUpdateByAuth0Id(String auth0Id) {
            return Optional.of(this);
        }

        @Override
        public Optional<UserAccountUpdate> findForUpdateByEmail(String email) {
            return Optional.empty();
        }

        @Override
        public boolean existsByPseudoIgnoringCaseExcept(String pseudo, Long accountId) {
            return false;
        }

        @Override
        public boolean existsByPseudoIgnoringCase(String pseudo) {
            return false;
        }

        @Override
        public UserAccountView create(NewUserAccount account) {
            throw new UnsupportedOperationException();
        }

        @Override
        public UserAccountView current() {
            return current;
        }

        @Override
        public UserAccountChange synchronize(UserIdentitySynchronization synchronization) {
            throw new UnsupportedOperationException();
        }

        @Override
        public UserAccountChange updateProfile(UserProfileChange change) {
            UserAccountView before = current;
            current = new UserAccountView(
                    before.id(),
                    before.auth0Id(),
                    before.email(),
                    change.replacePseudo() ? change.pseudo() : before.pseudo(),
                    before.firstName(),
                    before.lastName(),
                    change.replacePicture() ? change.pictureUrl() : before.pictureUrl(),
                    before.phoneNumber(),
                    change.active(),
                    before.createdAt(),
                    before.lastUpdate(),
                    before.favorites());
            return new UserAccountChange(before, current);
        }

        @Override
        public void delete() {
            throw new UnsupportedOperationException();
        }
    }

    /** Records storage effects while avoiding AWS initialization. */
    private static final class RecordingStorage implements ProfileImageStorage {
        private final List<String> calls = new ArrayList<>();
        private String deletedUrl;
        private UserProfileImageUpload uploaded;
        private boolean failUpload;

        @Override
        public String upload(UserProfileImageUpload upload, String folder) {
            calls.add("upload:" + folder);
            this.uploaded = upload;
            if (failUpload) {
                throw new IllegalStateException("upload failure");
            }
            return "https://cdn.example/new.png";
        }

        @Override
        public void deleteByUrl(String url) {
            calls.add("delete:" + url);
            this.deletedUrl = url;
        }
    }
}
