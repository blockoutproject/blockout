package com.blockout.backend.legal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.springframework.core.io.ClassPathResource;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.helpers.DefaultHandler;

/**
 * Validates complete bundled resources. Syntax/completeness checks prove neither publication nor
 * the accuracy of legal facts or dates. Documents use XML-compatible HTML for the JDK DOM parser.
 */
@DisplayName("Legal document content validation")
class LegalDocumentContentTest {
  @ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(strings = {"imprint", "privacy", "terms"})
  @DisplayName("Validates each complete bundled legal document before publication")
  void validatesBundledDocument(String kind) throws Exception {
    // Given
    String html =
        new ClassPathResource("static/legals/" + kind + ".html")
            .getContentAsString(StandardCharsets.UTF_8);

    // When / Then
    assertThatCode(() -> validate(html)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("Publishes an independently linkable deletion direction with the maintained email")
  void publishesExternalDeletionDirection() throws Exception {
    // Given
    String html =
        new ClassPathResource("static/legals/privacy.html")
            .getContentAsString(StandardCharsets.UTF_8);

    // When
    Document document = validate(html);
    Element section =
        (Element)
            XPathFactory.newInstance()
                .newXPath()
                .evaluate("//*[@id='account-deletion']", document, XPathConstants.NODE);

    // Then
    assertThat(section).as("the standalone privacy deletion anchor").isNotNull();
    Element contact = (Element) section.getElementsByTagName("a").item(0);
    assertThat(contact).as("a direct email action without application authentication").isNotNull();
    assertThat(contact.getAttribute("href"))
        .isEqualTo("mailto:blockoutproject@gmail.com?subject=Suppression%20de%20compte%20Blockout");
    assertThat(section.getElementsByTagName("form").getLength()).isZero();
  }

  /**
   * Checks whole XML-compatible HTML documents without loading external DTDs or entities. Header
   * title, visible version and time are separate from the article's nonempty content. A
   * syntactically valid date is not evidence of truthful modification; actual content still
   * requires human review.
   *
   * @param html complete source text using closed HTML tags
   * @return the complete document for focused semantic checks
   * @throws Exception for malformed HTML or an invalid ISO modification date
   * @throws AssertionError for missing, blank or inconsistent document content
   */
  private static Document validate(String html) throws Exception {
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
    assertThat(document.getElementsByTagName("script").getLength()).isZero();
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
    return document;
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
