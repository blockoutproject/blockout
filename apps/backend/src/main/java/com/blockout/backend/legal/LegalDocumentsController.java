package com.blockout.backend.legal;

import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Serves the three public legal documents from the backend release. */
@RestController
@RequiredArgsConstructor
public class LegalDocumentsController {
  private static final MediaType HTML_UTF8 = new MediaType("text", "html", StandardCharsets.UTF_8);
  private static final String MISSING_DOCUMENT =
      """
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Document indisponible</title>
        </head>
        <body>
          <main>
            <h1>Document indisponible</h1>
            <p>Ce document n’est pas disponible pour le moment. Vous pouvez réessayer plus tard.</p>
          </main>
        </body>
      </html>
      """;

  private final ResourceLoader resources;

  /**
   * Returns the bundled complete document or an explicit missing-page response. The exact kind
   * pattern prevents a resource path from becoming arbitrary classpath access. Reading performs no
   * account, advertising or acceptance operation.
   *
   * @param kind one of imprint, privacy or terms, selected by the route
   * @return the unchanged released UTF-8 HTML, or a truthful UTF-8 404 page when absent
   */
  @GetMapping(value = "/legals/{kind:imprint|privacy|terms}", produces = MediaType.TEXT_HTML_VALUE)
  ResponseEntity<Resource> read(@PathVariable String kind) {
    Resource document = resources.getResource("classpath:static/legals/" + kind + ".html");
    if (!document.exists()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND)
          .contentType(HTML_UTF8)
          .body(new ByteArrayResource(MISSING_DOCUMENT.getBytes(StandardCharsets.UTF_8)));
    }
    return ResponseEntity.ok().contentType(HTML_UTF8).body(document);
  }
}
