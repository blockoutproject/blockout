package com.blockout.workersearch.projection.snapshot.application;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.function.Predicate;

final class AtomicSnapshotMap<K, V> {

    private final AtomicReference<Map<K, V>> snapshot = new AtomicReference<>(Map.of());

    V get(K key) {
        return snapshot.get().get(key);
    }

    List<V> values() {
        return List.copyOf(snapshot.get().values());
    }

    int size() {
        return snapshot.get().size();
    }

    void replaceAll(Collection<V> values, Function<V, K> keyExtractor) {
        LinkedHashMap<K, V> replacement = new LinkedHashMap<>();
        values.forEach(value -> replacement.put(keyExtractor.apply(value), value));
        snapshot.set(Collections.unmodifiableMap(replacement));
    }

    void put(K key, V value) {
        update(current -> {
            LinkedHashMap<K, V> replacement = new LinkedHashMap<>(current);
            replacement.put(key, value);
            return replacement;
        });
    }

    void remove(K key) {
        update(current -> {
            LinkedHashMap<K, V> replacement = new LinkedHashMap<>(current);
            replacement.remove(key);
            return replacement;
        });
    }

    void removeIf(Predicate<V> predicate) {
        update(current -> {
            LinkedHashMap<K, V> replacement = new LinkedHashMap<>(current);
            replacement.entrySet().removeIf(entry -> predicate.test(entry.getValue()));
            return replacement;
        });
    }

    private void update(Function<Map<K, V>, Map<K, V>> operation) {
        Map<K, V> current;
        Map<K, V> replacement;
        do {
            current = snapshot.get();
            replacement = Collections.unmodifiableMap(operation.apply(current));
        } while (!snapshot.compareAndSet(current, replacement));
    }
}
