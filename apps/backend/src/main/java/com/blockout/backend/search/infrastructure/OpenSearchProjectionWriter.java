package com.blockout.backend.search.infrastructure;

import com.blockout.backend.search.application.SearchDocuments;
import com.blockout.backend.search.application.SearchProjectionBulkException;
import com.blockout.backend.search.application.SearchProjectionWriter;
import com.blockout.backend.search.application.SearchUnavailableException;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.client.json.JsonData;
import org.opensearch.client.json.JsonpDeserializer;
import org.opensearch.client.json.JsonpMapper;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch._types.Refresh;
import org.opensearch.client.opensearch._types.mapping.TypeMapping;
import org.opensearch.client.opensearch.core.BulkRequest;
import org.opensearch.client.opensearch.core.BulkResponse;
import org.opensearch.client.opensearch.indices.GetAliasResponse;
import org.opensearch.client.opensearch.indices.IndexSettings;
import org.opensearch.client.opensearch.indices.UpdateAliasesRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Official bulk/refresh/alias primitives; no engine writes hold a SQL transaction. */
@Component
@ConditionalOnProperty(prefix = "blockout.search", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class OpenSearchProjectionWriter implements SearchProjectionWriter {
  private final OpenSearchClient client;
  private final SearchIndexProperties indexes;

  /** {@inheritDoc} */
  @Override
  public Map<Kind, String> createGeneration() {
    Map<Kind, String> generation = new EnumMap<>(Kind.class);
    String suffix = "-g-" + UUID.randomUUID();
    JsonpMapper mapper = client._transport().jsonpMapper();
    try (InputStream input = getClass().getResourceAsStream("/search/indices.json");
        jakarta.json.stream.JsonParser parser = mapper.jsonProvider().createParser(input)) {
      Map<String, JsonData> definition =
          JsonpDeserializer.stringMapDeserializer(JsonData._DESERIALIZER)
              .deserialize(parser, mapper);
      IndexSettings settings =
          definition.get("settings").deserialize(IndexSettings._DESERIALIZER, mapper);
      TypeMapping mapping =
          definition.get("mappings").deserialize(TypeMapping._DESERIALIZER, mapper);
      for (Kind kind : List.of(Kind.CLUB, Kind.TEAM, Kind.POOL)) {
        String index = alias(kind) + suffix;
        if (!client
            .indices()
            .create(request -> request.index(index).settings(settings).mappings(mapping))
            .acknowledged()) throw new SearchUnavailableException();
        generation.put(kind, index);
      }
      return Map.copyOf(generation);
    } catch (IOException failure) {
      throw new SearchUnavailableException(failure);
    }
  }

  /** {@inheritDoc} */
  @Override
  public void write(String index, List<SearchDocuments> documents) {
    if (documents.isEmpty()) return;
    BulkRequest.Builder request = new BulkRequest.Builder();
    for (SearchDocuments document : documents)
      request.operations(
          operation ->
              operation.index(
                  item -> item.index(index).id(document.id().toString()).document(document)));
    bulk(request.build());
  }

  /** {@inheritDoc} */
  @Override
  public void update(Kind kind, Set<UUID> ids, List<SearchDocuments> documents) {
    if (ids.isEmpty()) return;
    BulkRequest.Builder request =
        new BulkRequest.Builder().requireAlias(true).refresh(Refresh.WaitFor);
    Set<UUID> visible =
        documents.stream().map(SearchDocuments::id).collect(java.util.stream.Collectors.toSet());
    for (SearchDocuments document : documents)
      request.operations(
          operation ->
              operation.index(
                  item -> item.index(alias(kind)).id(document.id().toString()).document(document)));
    for (UUID id : ids)
      if (!visible.contains(id))
        request.operations(
            operation -> operation.delete(item -> item.index(alias(kind)).id(id.toString())));
    bulk(request.build());
  }

  /**
   * Checks every native item and response cardinality, including deletes of already absent IDs.
   *
   * @param request one bounded native write request
   */
  private void bulk(BulkRequest request) {
    try {
      BulkResponse response = client.bulk(request);
      int succeeded =
          (int)
              response.items().stream()
                  .filter(
                      item ->
                          item.error() == null
                              && (item.status() < 300
                                  || (item.status() == 404
                                      && item.operationType()
                                          == org.opensearch.client.opensearch.core.bulk
                                              .OperationType.Delete)))
                  .count();
      if (response.errors()
          || response.items().size() != request.operations().size()
          || succeeded != request.operations().size())
        throw new SearchProjectionBulkException(request.operations().size(), succeeded);
    } catch (IOException failure) {
      throw new SearchUnavailableException(failure);
    }
  }

  /** {@inheritDoc} */
  @Override
  public void publish(Map<Kind, String> generation) {
    try {
      org.opensearch.client.opensearch.indices.RefreshResponse refreshed =
          client.indices().refresh(request -> request.index(new ArrayList<>(generation.values())));
      if (refreshed.shards().failed() != 0
          || refreshed.shards().successful() != refreshed.shards().total())
        throw new SearchUnavailableException();
      GetAliasResponse current = aliases();
      UpdateAliasesRequest.Builder request = new UpdateAliasesRequest.Builder();
      for (Map.Entry<Kind, String> target : generation.entrySet()) {
        String alias = alias(target.getKey());
        current
            .result()
            .forEach(
                (index, state) -> {
                  if (state.aliases().containsKey(alias))
                    request.actions(
                        action -> action.remove(remove -> remove.index(index).alias(alias)));
                });
        request.actions(action -> action.add(add -> add.index(target.getValue()).alias(alias)));
      }
      try {
        if (client.indices().updateAliases(request.build()).acknowledged()) return;
      } catch (IOException | RuntimeException uncertain) {
        if (published(generation, aliases())) return;
        throw new SearchUnavailableException(uncertain);
      }
      if (!published(generation, aliases())) throw new SearchUnavailableException();
    } catch (IOException failure) {
      throw new SearchUnavailableException(failure);
    }
  }

  /**
   * Verifies the complete current three-alias outcome after an uncertain native acknowledgement.
   *
   * @param generation candidate targets
   * @param current freshly read native metadata
   * @return whether each alias resolves exclusively to its candidate
   */
  private boolean published(Map<Kind, String> generation, GetAliasResponse current) {
    return generation.entrySet().stream()
        .allMatch(
            target ->
                current.result().entrySet().stream()
                    .filter(entry -> entry.getValue().aliases().containsKey(alias(target.getKey())))
                    .map(Map.Entry::getKey)
                    .toList()
                    .equals(List.of(target.getValue())));
  }

  /**
   * Reads all aliases in the owned namespace, including empty alias maps for temporary indexes.
   *
   * @return native current metadata; failure prevents deletion
   * @throws IOException when native state cannot be established
   */
  private GetAliasResponse aliases() throws IOException {
    return client
        .indices()
        .getAlias(
            request ->
                request
                    .index(indexes.prefix() + "-*")
                    .allowNoIndices(true)
                    .ignoreUnavailable(true));
  }

  /** {@inheritDoc} */
  @Override
  public void cleanup() {
    try {
      Pattern owned =
          Pattern.compile(
              Pattern.quote(indexes.prefix())
                  + "-(clubs|teams|pools)-g-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
      List<String> inactive =
          aliases().result().entrySet().stream()
              .filter(
                  entry ->
                      owned.matcher(entry.getKey()).matches()
                          && entry.getValue().aliases().isEmpty())
              .map(Map.Entry::getKey)
              .sorted()
              .limit(12)
              .toList();
      if (!inactive.isEmpty()
          && !client.indices().delete(request -> request.index(inactive)).acknowledged())
        throw new SearchUnavailableException();
    } catch (IOException | RuntimeException failure) {
      log.atWarn()
          .addKeyValue("operation", "search_projection")
          .addKeyValue("stage", "cleanup")
          .addKeyValue("outcome", "failed")
          .addKeyValue("reason", failure.getClass().getSimpleName())
          .log("Inactive search generation cleanup failed");
    }
  }

  /**
   * Resolves the existing resource alias; non-searchable owner kinds are rejected.
   *
   * @param kind searchable resource
   * @return environment-scoped alias
   */
  private String alias(Kind kind) {
    return indexes.prefix()
        + switch (kind) {
          case CLUB -> "-clubs";
          case TEAM -> "-teams";
          case POOL -> "-pools";
          case MATCH -> throw new IllegalArgumentException("Matches have no search index");
        };
  }
}
