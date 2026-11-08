package com.blockout.backend.legal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.stream.Stream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.core.io.ClassPathResource;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.helpers.DefaultHandler;

/**
 * Prepares complete-resource validation with synthetic fixtures only. The three deployable legal
 * resources still need verified facts and their own checks; this suite proves neither publication
 * nor the accuracy of a modification date. Fixtures use XML-compatible HTML for the JDK DOM parser.
 */
@DisplayName("Legal document content validation fixtures")
class LegalDocumentContentTest {
  @Test
  @DisplayName("Accepts a complete UTF-8 document with a free-form version")
  void acceptsCompleteDocument() throws Exception {
    // Given
    String html = fixture("complete.html");

    // When / Then
    assertThatCode(() -> validate(html)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("Accepts changed content retaining the same version label")
  void acceptsUnchangedVersion() throws Exception {
    // Given
    String original = fixture("complete.html");
    String updated = original.replace("Contenu complet synthétique", "Contenu synthétique corrigé");

    // When / Then
    assertThatCode(() -> validate(original)).doesNotThrowAnyException();
    assertThatCode(() -> validate(updated)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("Rejects an incomplete document even when metadata is present")
  void rejectsIncompleteDocument() throws Exception {
    // Given
    String html = fixture("incomplete.html");

    // When / Then
    assertThatThrownBy(() -> validate(html)).isInstanceOf(AssertionError.class);
  }

  @ParameterizedTest(name = "Rejects {0}")
  @MethodSource("invalidDocuments")
  @DisplayName("Rejects missing or empty metadata and content")
  void rejectsInvalidDocument(String scenario, String html) {
    // Given: each example changes only the named completeness condition.

    // When / Then
    assertThatThrownBy(() -> validate(html)).isInstanceOf(AssertionError.class);
  }

  @ParameterizedTest(name = "Rejects modification date {0}")
  @org.junit.jupiter.params.provider.ValueSource(
      strings = {"", "yesterday", "2026-02-30", "2026-13-01"})
  @DisplayName("Rejects invalid modification dates independently of free-form versions")
  void rejectsInvalidDate(String date) throws Exception {
    // Given
    String html =
        fixture("complete.html").replace("datetime=\"2026-11-08\"", "datetime=\"" + date + "\"");

    // When / Then
    assertThatThrownBy(() -> validate(html))
        .isInstanceOf(java.time.format.DateTimeParseException.class);
  }

  @Test
  @DisplayName("Rejects a truncated document rather than accepting its partial body")
  void rejectsTruncatedDocument() throws Exception {
    // Given
    String html = fixture("complete.html").replace("</article>", "");

    // When / Then
    assertThatThrownBy(() -> validate(html)).isInstanceOf(org.xml.sax.SAXParseException.class);
  }

  /**
   * Supplies omissions and blank values without introducing fictional deployable legal resources.
   *
   * @return independent malformed variants of the complete test-only document
   * @throws Exception if the checked-in fixture cannot be read
   */
  private static Stream<Arguments> invalidDocuments() throws Exception {
    String html = fixture("complete.html");
    return Stream.of(
        Arguments.of("a missing title", html.replaceAll("(?s)<title>.*?</title>", "")),
        Arguments.of(
            "a blank title", html.replaceAll("(?s)<title>.*?</title>", "<title> </title>")),
        Arguments.of("a missing version", html.replaceAll("(?s)<p data-version=.*?</p>", "")),
        Arguments.of(
            "a blank version",
            html.replace("data-version=\"édition de test / stable\"", "data-version=\" \"")),
        Arguments.of("a missing body", html.replaceAll("(?s)<body>.*</body>", "")),
        Arguments.of("a missing content", html.replaceAll("(?s)<article>.*?</article>", "")),
        Arguments.of(
            "blank content", html.replaceAll("(?s)<article>.*?</article>", "<article> </article>")),
        Arguments.of("a missing date", html.replaceAll("<time .*?</time>", "")),
        Arguments.of("an undisplayed date", html.replace(">2026-11-08</time>", "> </time>")),
        Arguments.of(
            "an inconsistent displayed title",
            html.replaceAll("<h1>.*</h1>", "<h1>Other fixture</h1>")),
        Arguments.of(
            "an undisplayed version",
            html.replace("Version : édition de test / stable", "Version indisponible")));
  }

  /**
   * Reads one UTF-8 fixture from its test-only directory.
   *
   * @param name fixture filename, never a deployable static/legals path
   * @return full document text
   * @throws Exception if the checked-in fixture is unavailable
   */
  private static String fixture(String name) throws Exception {
    return new ClassPathResource("legal-fixtures/" + name)
        .getContentAsString(StandardCharsets.UTF_8);
  }

  /**
   * Checks whole XML-compatible HTML documents without loading external DTDs or entities. Header
   * title, visible version and time are separate from the article's nonempty content. A
   * syntactically valid date is not evidence of truthful modification; actual content still
   * requires human review.
   *
   * @param html complete source text using closed HTML tags
   * @throws Exception for malformed HTML or an invalid ISO modification date
   * @throws AssertionError for missing, blank or inconsistent document content
   */
  private static void validate(String html) throws Exception {
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
    factory.setExpandEntityReferences(false);
    DocumentBuilder builder = factory.newDocumentBuilder();
    builder.setErrorHandler(new DefaultHandler());
    // HTML5's case-insensitive doctype is not part of XML parsing; no external DTD is needed.
    Document document =
        builder.parse(
            new InputSource(new StringReader(html.replaceFirst("(?i)<!doctype html>", ""))));
    assertThat(document.getDocumentElement().getTagName()).isEqualTo("html");
    assertThat(element(document, "head")).isNotNull();
    assertThat(element(document, "body")).isNotNull();
    String title = element(document, "title").getTextContent().strip();
    assertThat(title).isNotBlank();
    assertThat(element(document, "h1").getTextContent().strip()).isEqualTo(title);
    assertThat(element(document, "article").getTextContent()).isNotBlank();
    NodeList versions = document.getElementsByTagName("p");
    Element version = null;
    for (int index = 0; index < versions.getLength(); index++) {
      Element paragraph = (Element) versions.item(index);
      if (paragraph.hasAttribute("data-version")) {
        assertThat(version).as("one version per document").isNull();
        version = paragraph;
      }
    }
    assertThat(version).as("a visible free-form version").isNotNull();
    String label = version.getAttribute("data-version").strip();
    assertThat(label).isNotBlank();
    assertThat(version.getTextContent()).contains(label);
    Element modified = element(document, "time");
    assertThat(modified.getTextContent()).isNotBlank();
    LocalDate.parse(modified.getAttribute("datetime"));
  }

  /**
   * Selects a required unique semantic element instead of accepting an incomplete document.
   *
   * @param document parsed complete fixture
   * @param tag required HTML tag
   * @return the single element with this tag
   * @throws AssertionError if it is missing or ambiguous
   */
  private static Element element(Document document, String tag) {
    NodeList matches = document.getElementsByTagName(tag);
    assertThat(matches.getLength()).as("one %s element", tag).isEqualTo(1);
    return (Element) matches.item(0);
  }
}
