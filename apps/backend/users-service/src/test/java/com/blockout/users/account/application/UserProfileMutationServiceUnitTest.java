package com.blockout.users.account.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.repositories.UserRepository;
import java.lang.reflect.Proxy;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies retained profile mutation behavior through explicit image intent. */
@DisplayName("User profile mutation service")
class UserProfileMutationServiceUnitTest {

    /** Proves keep intent preserves the picture while trim and reactivation remain unchanged. */
    @Test
    @DisplayName("keeps the picture, trims the pseudo, and reactivates the account")
    void keepsPictureTrimsPseudoAndReactivatesAccount() {
        RepositoryState state = new RepositoryState(user("old", "https://cdn.example/old.png", false));
        RecordingStorage storage = new RecordingStorage();
        UserProfileMutationService service = new UserProfileMutationService(repository(state), storage);

        CustomUser updated = service.update(
                "auth0|owner", new UpdateUserProfileCommand("  new-name  ", UserProfileImageChange.keep()));

        assertThat(updated.getPseudo()).isEqualTo("new-name");
        assertThat(updated.getPictureUrl()).isEqualTo("https://cdn.example/old.png");
        assertThat(updated.getActive()).isTrue();
        assertThat(storage.deletedUrl).isNull();
        assertThat(storage.uploaded).isNull();
    }

    /** Proves remove intent deletes the current owned URL and clears the persisted field. */
    @Test
    @DisplayName("removes the stored picture explicitly")
    void removesStoredPictureExplicitly() {
        RepositoryState state = new RepositoryState(user("owner", "https://cdn.example/old.png", true));
        RecordingStorage storage = new RecordingStorage();
        UserProfileMutationService service = new UserProfileMutationService(repository(state), storage);

        CustomUser updated = service.update(
                "auth0|owner", new UpdateUserProfileCommand(null, UserProfileImageChange.remove()));

        assertThat(updated.getPictureUrl()).isNull();
        assertThat(storage.deletedUrl).isEqualTo("https://cdn.example/old.png");
        assertThat(storage.uploaded).isNull();
    }

    /** Proves replace intent retains delete-before-upload ordering and persists the returned URL. */
    @Test
    @DisplayName("replaces the stored picture with validated bytes")
    void replacesStoredPictureWithValidatedBytes() {
        RepositoryState state = new RepositoryState(user("owner", "https://cdn.example/old.png", true));
        RecordingStorage storage = new RecordingStorage();
        UserProfileMutationService service = new UserProfileMutationService(repository(state), storage);
        UserProfileImageUpload upload = new UserProfileImageUpload("new.png", "image/png", new byte[] {1, 2, 3});

        CustomUser updated = service.update(
                "auth0|owner", new UpdateUserProfileCommand(null, UserProfileImageChange.replace(upload)));

        assertThat(storage.deletedUrl).isEqualTo("https://cdn.example/old.png");
        assertThat(storage.uploaded).isEqualTo(upload);
        assertThat(updated.getPictureUrl()).isEqualTo("https://cdn.example/new.png");
    }

    /** Creates deterministic persisted account state for mutation tests. */
    private CustomUser user(String pseudo, String pictureUrl, boolean active) {
        return CustomUser.builder()
                .id(7L)
                .auth0Id("auth0|owner")
                .email("owner@example.com")
                .pseudo(pseudo)
                .pictureUrl(pictureUrl)
                .active(active)
                .createdAt(Instant.parse("2026-07-01T10:00:00Z"))
                .lastUpdate(Instant.parse("2026-07-01T10:00:00Z"))
                .build();
    }

    /** Creates a small repository double without Mockito agent attachment. */
    private UserRepository repository(RepositoryState state) {
        return (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[] {UserRepository.class},
                (proxy, method, arguments) -> switch (method.getName()) {
                    case "findByAuth0Id" -> Optional.of(state.user);
                    case "existsByPseudoIgnoreCaseAndIdNot" -> false;
                    case "save" -> state.user = (CustomUser) arguments[0];
                    case "toString" -> "UserRepositoryDouble";
                    case "hashCode" -> System.identityHashCode(proxy);
                    case "equals" -> proxy == arguments[0];
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }

    /** Holds mutable persisted state for the repository double. */
    private static final class RepositoryState {
        private CustomUser user;

        /** Creates repository state around one account. */
        private RepositoryState(CustomUser user) {
            this.user = user;
        }
    }

    /** Records storage effects while avoiding AWS initialization. */
    private static final class RecordingStorage implements ProfileImageStorage {
        private String deletedUrl;
        private UserProfileImageUpload uploaded;

        /** Records replacement bytes and returns a deterministic URL. */
        @Override
        public String upload(UserProfileImageUpload upload, String folder) {
            this.uploaded = upload;
            return "https://cdn.example/new.png";
        }

        /** Records the retained delete-before-upload call. */
        @Override
        public void deleteByUrl(String url) {
            this.deletedUrl = url;
        }
    }
}
