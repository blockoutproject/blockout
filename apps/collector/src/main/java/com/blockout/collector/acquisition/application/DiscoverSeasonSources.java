package com.blockout.collector.acquisition.application;

import com.blockout.collector.acquisition.ffvb.FfvbDiscovery;
import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.LongSupplier;
import lombok.extern.slf4j.Slf4j;
import org.apache.hc.core5.net.URIBuilder;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.event.Level;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

/**
 * Explicit current-entry and bound-catalog discovery; no scraper registry or activation authority.
 */
@Service
@Slf4j
public class DiscoverSeasonSources {
  /** Fixed official-entry identity; no provider URL or discovered identifier becomes a log key. */
  private record CurrentEntry(String scope, URI url) {}

  private static final List<CurrentEntry> FFVB_ENTRIES =
      List.of(
          new CurrentEntry(
              "ffvb-national", URI.create("https://www.ffvb.org/119-37-1-Championnats-Nationaux")),
          new CurrentEntry(
              "ffvb-regional", URI.create("https://www.ffvb.org/120-37-1-Championnats-Regionaux")),
          new CurrentEntry(
              "ffvb-departmental",
              URI.create("https://www.ffvb.org/122-37-1-Championnats-Departementaux")));
  private static final List<CurrentEntry> LNV_ENTRIES =
      List.of(
          new CurrentEntry(
              "lnv-women-first", URI.create("https://www.lnv.fr/competitions/saforelle-volstar")),
          new CurrentEntry(
              "lnv-men-first", URI.create("https://www.lnv.fr/competitions/alterna-volstar")),
          new CurrentEntry(
              "lnv-men-second", URI.create("https://www.lnv.fr/competitions/volstar-masculine-2")));
  private final ProviderPages ffvbHttp;
  private final ProviderPages lnvHttp;
  private final FfvbDiscovery ffvb;
  private final LnvDiscovery lnv;
  private final CollectionBackend backend;
  private final CollectorLifecycle lifecycle;
  private final Clock clock;

  /** Contextual catalog with its actual read completion time. */
  public record Read(SportingObservation.Catalog catalog, Instant observedAt) {}

  /** One bounded response consumed immediately, never retained as a passage page cache. */
  public record PageRead(ProviderResponse response, Instant observedAt, long ordinal) {}

  /**
   * Composes the existing budgets, native interpreters and generated proposal boundary.
   *
   * @param ffvbHttp shared FFVB transport
   * @param lnvHttp shared LNV transport
   * @param ffvb native FFVB discovery
   * @param lnv native LNV discovery
   * @param backend current source proposal owner
   * @param lifecycle current startup without a separate discovery control
   * @param clock actual read times
   */
  public DiscoverSeasonSources(
      @Qualifier("ffvbProviderClient") ProviderPages ffvbHttp,
      @Qualifier("lnvProviderClient") ProviderPages lnvHttp,
      FfvbDiscovery ffvb,
      LnvDiscovery lnv,
      CollectionBackend backend,
      CollectorLifecycle lifecycle,
      Clock clock) {
    this.ffvbHttp = ffvbHttp;
    this.lnvHttp = lnvHttp;
    this.ffvb = ffvb;
    this.lnv = lnv;
    this.backend = backend;
    this.lifecycle = lifecycle;
    this.clock = clock;
  }

  /**
   * Reads current official entries independently of pre-existing seasons or active calendars. The
   * owning scheduler chooses when to call this operation; no schedule is created here.
   */
  public void currentEntries() {
    lifecycle.requireActive();
    for (CurrentEntry entry : FFVB_ENTRIES)
      reportEntry(CollectionProviderEnum.FFVB, entry.scope(), currentFfvb(entry.url()));
    for (CurrentEntry entry : LNV_ENTRIES) {
      boolean usable = false;
      boolean complete = true;
      try {
        lifecycle.requireActive();
        ProviderResponse page = lnvHttp.page(entry.url()).join();
        for (Element frame :
            Jsoup.parse(new String(page.body(), StandardCharsets.UTF_8), page.url().toString())
                .select("iframe[src]")) {
          URI candidate = URI.create(frame.absUrl("src"));
          if (!"lnv-web.dataproject.com".equalsIgnoreCase(candidate.getHost())) continue;
          String competition = query(candidate).get("ID");
          if (competition == null) continue;
          ProviderResponse source = lnvHttp.page(candidate).join();
          String season = lnv.qualify(source.body(), source.url(), competition);
          usable = true;
          if (season != null)
            complete &=
                propose(CollectionProviderEnum.LNV, competition, season, candidate, entry.url());
        }
      } catch (RuntimeException failure) {
        complete = false;
        discoveryFailure(failure);
      }
      reportEntry(CollectionProviderEnum.LNV, entry.scope(), usable && complete);
    }
  }

  /**
   * Traverses only the bound source's published native catalog, keeping failures distinct from
   * absence.
   *
   * @param target admitted discovery binding and season
   * @return complete or partial catalog; unsupported roots throw rather than fabricate emptiness
   */
  public Read catalog(CollectionBackend.Target target) {
    return catalog(target, () -> 0, page -> {});
  }

  /**
   * Streams shared pages to already admitted scopes before discarding each body.
   *
   * @param target seasonal discovery scope
   * @param nextOrdinal allocator called before every actual page read
   * @param consume immediate consumer; must not retain raw pages or ineligible sporting rows
   * @return aggregated catalog with actual final discovery read time
   */
  public Read catalog(
      CollectionBackend.Target target, LongSupplier nextOrdinal, Consumer<PageRead> consume) {
    if (target.provider() == CollectionProviderEnum.LNV)
      return lnvCatalog(target, nextOrdinal, consume);
    ffvb.requireContext(target.url(), target.seasonLabel(), target.organizerReference());
    ArrayDeque<URI> pending = new ArrayDeque<>(List.of(target.url()));
    Set<URI> visited = new LinkedHashSet<>();
    List<SportingObservation.Pool> pools = new ArrayList<>();
    boolean complete = true;
    boolean recognized = false;
    Instant observedAt = clock.instant();
    while (!pending.isEmpty()) {
      URI url = pending.removeFirst();
      if (!visited.add(url)) continue;
      if (visited.size() > 512)
        throw new FfvbAcquisitionException("FFVB discovery exceeds bounded navigation");
      lifecycle.requireActive();
      try {
        long ordinal = nextOrdinal.getAsLong();
        ProviderResponse response = ffvbHttp.page(url).join();
        observedAt = clock.instant();
        ffvb.requireContext(response.url(), target.seasonLabel(), target.organizerReference());
        consume.accept(new PageRead(response, observedAt, ordinal));
        try {
          SportingObservation.Catalog found =
              ffvb.parse(
                  response.body(),
                  response.url(),
                  target.seasonLabel(),
                  target.organizerReference());
          recognized |= ffvb.seasonal(response.body(), response.url());
          complete &= found.complete();
          pools.addAll(found.pools());
          pending.addAll(
              ffvb.roundLinks(
                  response.body(),
                  response.url(),
                  target.seasonLabel(),
                  target.organizerReference()));
        } catch (FfvbAcquisitionException unsupported) {
          List<URI> links = ffvb.navigation(response.body(), response.url());
          if (links.isEmpty()) complete = false;
          else pending.addAll(links);
        }
      } catch (CollectionBackendFailure failure) {
        throw failure;
      } catch (RuntimeException failure) {
        complete = false;
      }
    }
    if (!recognized) throw new FfvbAcquisitionException("No qualified FFVB catalog");
    return new Read(
        new SportingObservation.Catalog(complete, pools.stream().distinct().toList()), observedAt);
  }

  /**
   * Follows the bound championship's own phases; rollover at today's entry cannot remove old roots.
   *
   * @param target exact admitted championship
   * @param nextOrdinal pre-read order allocator
   * @param consume immediate selected-scope consumer
   * @return published phase/group references, never sampled numeric IDs
   */
  private Read lnvCatalog(
      CollectionBackend.Target target, LongSupplier nextOrdinal, Consumer<PageRead> consume) {
    long rootOrdinal = nextOrdinal.getAsLong();
    ProviderResponse root = lnvHttp.page(target.url()).join();
    Instant observedAt = clock.instant();
    String season = lnv.qualify(root.body(), root.url(), target.organizerReference());
    if (season != null && !season.equals(target.seasonLabel()))
      throw new IllegalArgumentException("Contradictory LNV season");
    consume.accept(new PageRead(root, observedAt, rootOrdinal));
    List<SportingObservation.Pool> pools = new ArrayList<>();
    boolean complete = true;
    for (URI phase : lnv.phaseLinks(root.body(), root.url(), target.organizerReference())) {
      lifecycle.requireActive();
      try {
        ProviderResponse page = root;
        if (!phase.equals(root.url())) {
          long ordinal = nextOrdinal.getAsLong();
          page = lnvHttp.page(phase).join();
          observedAt = clock.instant();
          String phaseSeason = lnv.qualify(page.body(), page.url(), target.organizerReference());
          if (phaseSeason != null && !phaseSeason.equals(target.seasonLabel()))
            throw new IllegalArgumentException("Contradictory LNV season");
          if (!target.organizerReference().equals(query(page.url()).get("ID"))
              || !query(phase).get("PID").equals(query(page.url()).get("PID")))
            throw new IllegalArgumentException("Contradictory phase");
          consume.accept(new PageRead(page, observedAt, ordinal));
        }
        Map<String, String> context = query(page.url());
        if (!target.organizerReference().equals(context.get("ID"))
            || !query(phase).get("PID").equals(context.get("PID")))
          throw new IllegalArgumentException("Contradictory phase");
        Document document =
            Jsoup.parse(new String(page.body(), StandardCharsets.UTF_8), page.url().toString());
        List<Element> groups = document.select("div.rmpView[id^=Content_Main_]");
        if (groups.isEmpty()) throw new IllegalArgumentException("Missing groups");
        for (Element group : groups) {
          String id = group.id().substring("Content_Main_".length());
          Element title = group.selectFirst("[id$=lbl_title]");
          if (!id.matches("[0-9]+") || title == null)
            throw new IllegalArgumentException("Invalid group");
          URI standings = null;
          for (Element link : document.select("a[href*=CompetitionStandings.aspx]")) {
            URI proposed = URI.create(link.absUrl("href"));
            if (context.get("ID").equals(query(proposed).get("ID"))
                && (!query(proposed).containsKey("PID")
                    || context.get("PID").equals(query(proposed).get("PID")))) standings = proposed;
          }
          pools.add(
              new SportingObservation.Pool(
                  context.get("ID"),
                  context.get("ID"),
                  context.get("PID"),
                  null,
                  id,
                  page.url(),
                  standings,
                  title.text()));
        }
      } catch (CollectionBackendFailure failure) {
        throw failure;
      } catch (RuntimeException failure) {
        complete = false;
      }
    }
    return new Read(new SportingObservation.Catalog(complete, pools), observedAt);
  }

  /**
   * Reads published current FFVB menus and submits only a uniquely evidenced sporting year.
   *
   * @param entry one fixed official current entry, never an archive crawl root
   * @return whether the entry yielded qualified evidence without an unreadable branch; a leaf must
   *     have attributable catalog context or native navigation
   */
  private boolean currentFfvb(URI entry) {
    boolean usable = false;
    boolean complete = true;
    try {
      ProviderResponse page = ffvbHttp.page(entry).join();
      Set<URI> seen = new LinkedHashSet<>();
      ArrayDeque<URI> pending = new ArrayDeque<>(ffvb.navigation(page.body(), page.url()));
      while (!pending.isEmpty()) {
        URI candidate = pending.removeFirst();
        if (!seen.add(candidate)) continue;
        if (seen.size() > 512) throw new IllegalArgumentException("Discovery navigation bound");
        lifecycle.requireActive();
        try {
          ProviderResponse source = ffvbHttp.page(candidate).join();
          List<URI> links = ffvb.navigation(source.body(), source.url());
          List<String> organizers =
              links.stream()
                  .map(this::query)
                  .map(fields -> fields.get("codent"))
                  .filter(Objects::nonNull)
                  .distinct()
                  .toList();
          List<String> seasons =
              links.stream()
                  .map(this::query)
                  .map(fields -> fields.get("saison"))
                  .filter(Objects::nonNull)
                  .distinct()
                  .toList();
          List<URI> navigation =
              links.stream()
                  .filter(link -> !link.getPath().endsWith("vbspo_calendrier.php"))
                  .toList();
          if (!organizers.isEmpty() && seasons.size() == 1) {
            for (String organizer : organizers) {
              try {
                SportingObservation.Catalog catalog =
                    ffvb.parse(source.body(), source.url(), seasons.getFirst(), organizer);
                complete &= catalog.complete();
                if (catalog.complete()) {
                  boolean accepted =
                      propose(
                          CollectionProviderEnum.FFVB,
                          organizer,
                          seasons.getFirst(),
                          source.url(),
                          entry);
                  usable |= accepted;
                  complete &= accepted;
                }
              } catch (FfvbAcquisitionException unsupported) {
                complete = false;
              }
            }
          } else if (navigation.isEmpty()) {
            complete = false;
          }
          pending.addAll(navigation);
        } catch (RuntimeException failure) {
          complete = false;
          discoveryFailure(failure);
        }
      }
    } catch (RuntimeException failure) {
      complete = false;
      discoveryFailure(failure);
    }
    return usable && complete;
  }

  /**
   * Submits one actually evidenced year; changed IDs alone never create a season.
   *
   * @param provider source authority
   * @param organizer native root
   * @param season positive published season label
   * @param candidate published root URL
   * @param entry official evidence entry
   * @return whether a qualified consecutive year proposal was accepted
   */
  private boolean propose(
      CollectionProviderEnum provider, String organizer, String season, URI candidate, URI entry) {
    if (!season.matches("[0-9]{4}/[0-9]{4}")) return false;
    long year = Long.parseLong(season.substring(0, 4));
    if (!season.endsWith(Long.toString(year + 1))) return false;
    backend.observeSource(
        new CollectionBackend.SourceProposal(
            lifecycle.getIncarnationId(),
            year,
            provider,
            organizer,
            candidate,
            entry,
            clock.instant()));
    return true;
  }

  /**
   * Reads native query values from a published discovery reference.
   *
   * @param uri published reference
   * @return exact native query fields
   */
  private Map<String, String> query(URI uri) {
    Map<String, String> values = new LinkedHashMap<>();
    new URIBuilder(uri)
        .getQueryParams()
        .forEach(field -> values.put(field.getName(), field.getValue()));
    return values;
  }

  /**
   * Leaves this entry unusable while refusing further work from a replaced collector.
   *
   * @param failure failed read or proposal
   */
  private void discoveryFailure(RuntimeException failure) {
    if (failure instanceof CollectionBackendFailure refused
        && refused.getKind() == CollectionBackendFailure.Kind.CONFLICT) {
      if (!lifecycle.getIncarnationId().equals(backend.current().incarnationId())) lifecycle.stop();
    }
    lifecycle.requireActive();
  }

  /**
   * Emits one bounded ordinary entry summary, so only this entry's usable reread ends its
   * condition. A readable page without qualified source context is not recovery; accepted neighbors
   * survive partial failure. Native Grafana owns grouping and reminders, without persisted alert
   * state.
   *
   * @param provider fixed entry authority
   * @param scope fixed nonpersonal official-entry identity
   * @param usable whether the whole attempted entry yielded usable evidence
   */
  private void reportEntry(CollectionProviderEnum provider, String scope, boolean usable) {
    log.atLevel(usable ? Level.INFO : Level.WARN)
        .addKeyValue("operation", "source_discovery")
        .addKeyValue("provider", provider.getValue())
        .addKeyValue("scope", scope)
        .addKeyValue("stage", "discovery")
        .addKeyValue("outcome", usable ? "success" : "failed")
        .addKeyValue("collection_entry_usable", usable ? 1 : 0)
        .log("Current official entry observation");
  }
}
