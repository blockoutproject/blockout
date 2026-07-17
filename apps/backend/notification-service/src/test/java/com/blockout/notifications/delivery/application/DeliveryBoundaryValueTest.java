package com.blockout.notifications.delivery.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class DeliveryBoundaryValueTest {

    @Test
    void deliveryBatchResultOwnsImmutableCopies() {
        Set<Long> successful = new LinkedHashSet<>(Set.of(1L));
        List<String> invalid = new ArrayList<>(List.of("token"));

        DeliveryBatchResult result = new DeliveryBatchResult(successful, null, invalid);
        successful.add(2L);
        invalid.add("other");

        assertThat(result.successfulUserIds()).containsExactlyInAnyOrder(1L);
        assertThat(result.failedUserIds()).isEmpty();
        assertThat(result.invalidTokens()).containsExactly("token");
        assertThatThrownBy(() -> result.invalidTokens().add("forbidden"))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void tokenPageOwnsImmutableNestedCopies() {
        List<String> tokens = new ArrayList<>(List.of("token"));
        Map<Long, List<String>> byUser = new LinkedHashMap<>();
        byUser.put(1L, tokens);

        DeliveryTokenPage page = new DeliveryTokenPage(byUser, null);
        tokens.add("other");
        byUser.put(2L, List.of("second"));

        assertThat(page.tokensByUser()).containsOnlyKeys(1L);
        assertThat(page.tokensByUser().get(1L)).containsExactly("token");
        assertThat(page.noTokenUserIds()).isEmpty();
        assertThatThrownBy(() -> page.tokensByUser().get(1L).add("forbidden"))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
