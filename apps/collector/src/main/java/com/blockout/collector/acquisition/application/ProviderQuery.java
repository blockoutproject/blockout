package com.blockout.collector.acquisition.application;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;
import org.apache.hc.core5.http.NameValuePair;
import org.apache.hc.core5.net.URIBuilder;

/** Decodes native provider query fields without choosing between contradictory values. */
public final class ProviderQuery {
  private ProviderQuery() {}

  /**
   * Preserves provider values, including empty or valueless fields and identical repetitions.
   *
   * @param uri published source reference
   * @param contradiction source interpreter's safe context refusal
   * @return fields in publication order
   */
  public static Map<String, String> fields(
      URI uri, Supplier<? extends RuntimeException> contradiction) {
    Map<String, String> fields = new LinkedHashMap<>();
    for (NameValuePair parameter : new URIBuilder(uri).getQueryParams()) {
      String name = parameter.getName();
      String value = parameter.getValue();
      if (fields.containsKey(name) && !Objects.equals(fields.get(name), value)) {
        throw contradiction.get();
      }
      fields.put(name, value);
    }
    return fields;
  }
}
