package com.blockout.collector.acquisition.application;

import com.blockout.collector.acquisition.ffvb.FfvbDiscovery;
import com.blockout.collector.acquisition.ffvb.FfvbDiscovery.NavigationLink;
import com.blockout.collector.acquisition.ffvb.FfvbPage;
import com.blockout.collector.acquisition.lnv.LnvAcquisitionException;
import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.acquisition.lnv.LnvDiscovery.Championship;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionSourceScopeEnum;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.LongSupplier;
import lombok.extern.slf4j.Slf4j;
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
  private record CurrentEntry(CollectionSourceScopeEnum scope, URI url) {}

  private record LnvEntry(String scope, URI url, Championship championship, String displayName) {}

  private static final List<CurrentEntry> FFVB_ENTRIES =
      List.of(
          new CurrentEntry(
              CollectionSourceScopeEnum.NATIONAL,
              URI.create("https://www.ffvb.org/119-37-1-Championnats-Nationaux")),
          new CurrentEntry(
              CollectionSourceScopeEnum.REGIONAL,
              URI.create("https://www.ffvb.org/120-37-1-Championnats-Regionaux")),
          new CurrentEntry(
              CollectionSourceScopeEnum.DEPARTMENTAL,
              URI.create("https://www.ffvb.org/122-37-1-Championnats-Departementaux")));
  private static final List<LnvEntry> LNV_ENTRIES =
      List.of(
          new LnvEntry(
              "lnv-women-first",
              URI.create("https://www.lnv.fr/competitions/saforelle-volstar"),
              Championship.WOMEN_FIRST,
              "D1 féminine"),
          new LnvEntry(
              "lnv-men-first",
              URI.create("https://www.lnv.fr/competitions/alterna-volstar"),
              Championship.MEN_FIRST,
              "D1 masculine"),
          new LnvEntry(
              "lnv-men-second",
              URI.create("https://www.lnv.fr/competitions/volstar-masculine-2"),
              Championship.MEN_SECOND,
              "D2 masculine"));
  private final ProviderPages ffvbHttp;
  private final ProviderPages lnvHttp;
  private final FfvbDiscovery ffvb;
  private final LnvDiscovery lnv;
  private final CollectionBackend backend;
  private final CollectorLifecycle lifecycle;
  private final Clock clock;

  /** Contextual catalog with actual read completion time and optional incomplete-read evidence. */
  public record Read(
      SportingObservation.Catalog catalog, Instant observedAt, URI reasonType, String reason) {
    private Read(
        SportingObservation.Catalog catalog, Instant observedAt, RuntimeException failure) {
      this(
          catalog,
          observedAt,
          failure == null ? null : AcquisitionFailure.reasonType(failure),
          failure == null ? null : AcquisitionFailure.reason(failure));
    }
  }

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
    for (CurrentEntry entry : FFVB_ENTRIES) {
      reportEntry(
          CollectionProviderEnum.FFVB, "ffvb-" + entry.scope().getValue(), currentFfvb(entry));
    }
    for (LnvEntry entry : LNV_ENTRIES) {
      boolean usable = false;
      boolean complete = true;
      try {
        lifecycle.requireActive();
        ProviderResponse page = lnvHttp.page(entry.url());
        for (Element frame :
            Jsoup.parse(new String(page.body(), StandardCharsets.UTF_8), page.url().toString())
                .select("iframe[src]")) {
          URI candidate = URI.create(frame.absUrl("src"));
          String competition = lnv.championshipReference(candidate);
          if (competition == null) {
            continue;
          }
          ProviderResponse source = lnvHttp.page(candidate);
          LnvDiscovery.Root root = lnv.root(source.body(), source.url(), competition);
          if (root.championship() != entry.championship()) {
            complete = false;
            continue;
          }
          usable = true;
          if (root.season() != null) {
            complete &=
                propose(
                    CollectionProviderEnum.LNV,
                    competition,
                    root.season(),
                    candidate,
                    entry.url(),
                    entry.displayName(),
                    null);
          }
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
   * @throws RuntimeException if no seasonal catalog is recognized; failed reads retain their
   *     original category
   */
  public Read catalog(CollectionBackend.Target target) {
    return catalog(target, false, () -> 0, page -> {});
  }

  /**
   * Streams shared pages to already admitted scopes before discarding each body.
   *
   * @param target seasonal discovery scope
   * @param verifiedHistorical exact historical source admitted with verified reference evidence
   * @param nextOrdinal allocator called before every actual page read
   * @param consume immediate consumer; must not retain raw pages or ineligible sporting rows
   * @return aggregated catalog with actual final discovery read time
   * @throws RuntimeException if no seasonal catalog is recognized; failed reads retain their
   *     original category
   */
  public Read catalog(
      CollectionBackend.Target target,
      boolean verifiedHistorical,
      LongSupplier nextOrdinal,
      Consumer<PageRead> consume) {
    if (target.provider() == CollectionProviderEnum.LNV) {
      return lnvCatalog(target, verifiedHistorical, nextOrdinal, consume);
    }
    ffvb.requireContext(target.url(), target.seasonLabel(), target.organizerReference());
    ArrayDeque<URI> pending = new ArrayDeque<>(List.of(target.url()));
    Set<URI> visited = new LinkedHashSet<>();
    List<SportingObservation.Pool> pools = new ArrayList<>();
    boolean recognized = false;
    RuntimeException firstFailure = null;
    Instant observedAt = clock.instant();
    while (!pending.isEmpty()) {
      URI url = pending.removeFirst();
      if (!visited.add(url)) {
        continue;
      }
      if (visited.size() > 512) {
        throw new FfvbAcquisitionException("FFVB discovery exceeds bounded navigation");
      }
      lifecycle.requireActive();
      try {
        PageRead read = readPage(ffvbHttp, url, nextOrdinal);
        ProviderResponse response = read.response();
        observedAt = read.observedAt();
        ffvb.requireContext(response.url(), target.seasonLabel(), target.organizerReference());
        consume.accept(read);
        Document page = FfvbPage.document(response.body(), response.url());
        try {
          SportingObservation.Catalog found =
              ffvb.parse(page, target.seasonLabel(), target.organizerReference());
          recognized |= ffvb.seasonal(page);
          if (!found.complete() && firstFailure == null) {
            firstFailure = new FfvbAcquisitionException("Unqualified FFVB catalog entries");
          }
          pools.addAll(found.pools());
          pending.addAll(ffvb.roundLinks(page, target.seasonLabel(), target.organizerReference()));
        } catch (FfvbAcquisitionException unsupported) {
          List<URI> links = ffvb.navigation(page);
          if (links.isEmpty()) {
            if (firstFailure == null) {
              firstFailure = unsupported;
            }
          } else {
            pending.addAll(links);
          }
        }
      } catch (CollectionBackendFailure failure) {
        throw failure;
      } catch (RuntimeException failure) {
        observedAt = clock.instant();
        if (firstFailure == null) {
          firstFailure = failure;
        }
      }
    }
    if (!recognized) {
      if (firstFailure != null) {
        throw firstFailure;
      }
      throw new FfvbAcquisitionException("No qualified FFVB catalog");
    }
    return new Read(
        new SportingObservation.Catalog(firstFailure == null, pools.stream().distinct().toList()),
        observedAt,
        firstFailure);
  }

  /**
   * Follows the bound championship's own phases; rollover at today's entry cannot remove old roots.
   *
   * @param target exact admitted championship
   * @param verifiedHistorical whether stored historical verification supplies missing root season
   * @param nextOrdinal pre-read order allocator
   * @param consume immediate selected-scope consumer
   * @return published phase/group references, never sampled numeric IDs
   */
  private Read lnvCatalog(
      CollectionBackend.Target target,
      boolean verifiedHistorical,
      LongSupplier nextOrdinal,
      Consumer<PageRead> consume) {
    PageRead root = readPage(lnvHttp, target.url(), nextOrdinal);
    ProviderResponse rootResponse = root.response();
    Instant observedAt = root.observedAt();
    LnvDiscovery.Root qualified =
        lnv.root(rootResponse.body(), rootResponse.url(), target.organizerReference());
    if (qualified.season() == null && !verifiedHistorical) {
      throw new LnvAcquisitionException("LNV championship has no published season");
    }
    if (qualified.season() != null && !qualified.season().equals(target.seasonLabel())) {
      throw new LnvAcquisitionException("LNV championship belongs to a different season");
    }
    List<SportingObservation.Pool> pools = new ArrayList<>();
    Map<String, String> phaseLabels = new HashMap<>();
    RuntimeException firstFailure = null;
    for (LnvDiscovery.Phase phase : qualified.phases()) {
      lifecycle.requireActive();
      try {
        PageRead read = root;
        if (!phase.url().equals(rootResponse.url())) {
          read = readPage(lnvHttp, phase.url(), nextOrdinal);
          observedAt = read.observedAt();
        }
        ProviderResponse page = read.response();
        pools.addAll(lnv.phasePools(page.body(), page.url(), phase.url(), target.seasonLabel()));
        if (phase.label() != null) {
          phaseLabels.put(phase.reference(), phase.label());
        }
        consume.accept(read);
      } catch (CollectionBackendFailure failure) {
        throw failure;
      } catch (RuntimeException failure) {
        observedAt = clock.instant();
        if (firstFailure == null) {
          firstFailure = failure;
        }
      }
    }
    if (pools.isEmpty() && firstFailure != null) {
      throw firstFailure;
    }
    return new Read(
        new SportingObservation.Catalog(firstFailure == null, pools, phaseLabels),
        observedAt,
        firstFailure);
  }

  private PageRead readPage(ProviderPages provider, URI url, LongSupplier nextOrdinal) {
    long ordinal = nextOrdinal.getAsLong();
    ProviderResponse response = provider.page(url);
    return new PageRead(response, clock.instant(), ordinal);
  }

  /**
   * Reads published current FFVB menus and submits only a uniquely evidenced sporting year.
   *
   * @param entry one fixed official current entry, never an archive crawl root
   * @return whether the entry yielded qualified evidence without an unreadable branch; a leaf must
   *     have attributable catalog context or native navigation
   */
  private boolean currentFfvb(CurrentEntry entry) {
    boolean usable = false;
    boolean complete = true;
    try {
      ProviderResponse root = ffvbHttp.page(entry.url());
      Set<URI> seen = new LinkedHashSet<>();
      ArrayDeque<NavigationLink> pending =
          new ArrayDeque<>(ffvb.publishedNavigation(FfvbPage.document(root.body(), root.url())));
      while (!pending.isEmpty()) {
        NavigationLink candidate = pending.removeFirst();
        if (!seen.add(candidate.target())) {
          continue;
        }
        if (seen.size() > 512) {
          throw new IllegalArgumentException("Discovery navigation bound");
        }
        lifecycle.requireActive();
        try {
          ProviderResponse source = ffvbHttp.page(candidate.target());
          Document page = FfvbPage.document(source.body(), source.url());
          List<NavigationLink> links = ffvb.publishedNavigation(page);
          List<Map<String, String>> fields =
              links.stream().map(NavigationLink::target).map(this::query).toList();
          List<String> organizers =
              fields.stream()
                  .map(link -> link.get("codent"))
                  .filter(Objects::nonNull)
                  .distinct()
                  .toList();
          List<String> seasons =
              fields.stream()
                  .map(link -> link.get("saison"))
                  .filter(Objects::nonNull)
                  .distinct()
                  .toList();
          List<NavigationLink> navigation =
              links.stream()
                  .filter(link -> !link.target().getPath().endsWith("vbspo_calendrier.php"))
                  .toList();
          if (!organizers.isEmpty() && seasons.size() == 1) {
            for (String organizer : organizers) {
              try {
                SportingObservation.Catalog catalog =
                    ffvb.parse(page, seasons.getFirst(), organizer);
                complete &= catalog.complete();
                if (catalog.complete()) {
                  boolean accepted =
                      propose(
                          CollectionProviderEnum.FFVB,
                          organizer,
                          seasons.getFirst(),
                          source.url(),
                          entry.url(),
                          ffvbName(entry.scope(), candidate, organizer, organizers.size() == 1),
                          entry.scope());
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
   * Uses a visible league or committee name only when the link or its resolved menu identifies the
   * organizer. Generic navigation and multi-organizer headings supply no display name.
   */
  private String ffvbName(
      CollectionSourceScopeEnum scope, NavigationLink link, String organizer, boolean singleMenu) {
    if (scope == CollectionSourceScopeEnum.NATIONAL) {
      return "Championnats nationaux";
    }
    String linkedOrganizer = query(link.target()).get("codent");
    if (!(organizer.equals(linkedOrganizer) || linkedOrganizer == null && singleMenu)) {
      return null;
    }
    String prefix = scope == CollectionSourceScopeEnum.REGIONAL ? "ligue " : "comité ";
    List<String> names =
        link.labels().stream()
            .filter(
                label -> label.length() <= 160 && label.toLowerCase(Locale.ROOT).startsWith(prefix))
            .distinct()
            .limit(2)
            .toList();
    return names.size() == 1 ? names.getFirst() : null;
  }

  /**
   * Submits one actually evidenced year; changed IDs alone never create a season.
   *
   * @param provider source authority
   * @param organizer native root
   * @param season positive published season label
   * @param candidate published root URL
   * @param entry official evidence entry
   * @param displayName attributable or established name, when available
   * @param scope official FFVB discovery scope, absent for LNV
   * @return whether a qualified consecutive year proposal was accepted
   */
  private boolean propose(
      CollectionProviderEnum provider,
      String organizer,
      String season,
      URI candidate,
      URI entry,
      String displayName,
      CollectionSourceScopeEnum scope) {
    if (!season.matches("[0-9]{4}/[0-9]{4}")) {
      return false;
    }
    long year = Long.parseLong(season.substring(0, 4));
    if (!season.endsWith(Long.toString(year + 1))) {
      return false;
    }
    backend.observeSource(
        new CollectionBackend.SourceProposal(
            lifecycle.getIncarnationId(),
            year,
            provider,
            organizer,
            candidate,
            entry,
            clock.instant(),
            displayName,
            scope));
    return true;
  }

  /**
   * Reads native query values from a published discovery reference.
   *
   * @param uri published reference
   * @return exact native query fields
   */
  private Map<String, String> query(URI uri) {
    return ProviderQuery.fields(
        uri, () -> new IllegalArgumentException("Contradictory official entry URL"));
  }

  /**
   * Leaves this entry unusable while refusing further work from a replaced collector.
   *
   * @param failure failed read or proposal
   */
  private void discoveryFailure(RuntimeException failure) {
    if (failure instanceof CollectionBackendFailure refused) {
      lifecycle.inspectConflict(refused);
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
