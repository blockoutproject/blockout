package com.blockout.collector.acquisition.lnv;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

/** Follows native championship phase links; sampled ID/PID values never become configuration. */
@Component
public class LnvDiscovery {
  /**
   * Verifies the expected supported championship and returns only explicit seasonal evidence.
   *
   * @param bytes complete candidate HTML
   * @param url final response URL after supported redirects
   * @param competition expected native championship reference
   * @return published season label, or null when explicit operator confirmation is needed
   */
  public String qualify(byte[] bytes, URI url, String competition) {
    if (!"lnv-web.dataproject.com".equalsIgnoreCase(url.getHost())
        || !competition.equals(LnvPage.query(url).get("ID"))) throw LnvPage.invalid();
    Document page = LnvPage.parse(bytes, url);
    String title = page.select("title, [id$=lbl_title]").text().toLowerCase(Locale.ROOT);
    if (!(title.contains("alterna volstar")
        || title.contains("saforelle volstar")
        || title.contains("volstar masculine 2")
        || title.contains("ligue a masculine")
        || title.contains("ligue a féminine")
        || title.contains("ligue b masculine"))) throw LnvPage.invalid();
    phaseLinks(bytes, url, competition);
    return LnvPage.season(page);
  }

  /**
   * Selects published calendar phase links belonging to the expected championship.
   *
   * @param bytes bounded official championship HTML
   * @param url actual page base
   * @param competition expected native championship identity
   * @return distinct published phase URLs in source order
   */
  public List<URI> phaseLinks(byte[] bytes, URI url, String competition) {
    List<URI> result = new ArrayList<>();
    for (Element link : LnvPage.parse(bytes, url).select("a[href]")) {
      URI target;
      try {
        target = url.resolve(link.attr("href"));
      } catch (IllegalArgumentException failure) {
        throw LnvPage.invalid();
      }
      if ("lnv-web.dataproject.com".equalsIgnoreCase(target.getHost())
          && target.getPath().endsWith("/CompetitionMatches.aspx")
          && competition.equals(LnvPage.query(target).get("ID"))
          && LnvPage.query(target).containsKey("PID")) result.add(target);
    }
    if (result.isEmpty()) throw LnvPage.invalid();
    return result.stream().distinct().toList();
  }
}
