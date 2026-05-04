import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  escapeHtmlAttribute,
  isAllowedRichTextHref,
  stripSingleParagraphWrapper,
} from "./sanitize";

describe("isAllowedRichTextHref", () => {
  it("blocks script, file, data, and external network links", () => {
    expect(isAllowedRichTextHref("javascript:alert(1)")).toBe(false);
    expect(isAllowedRichTextHref("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isAllowedRichTextHref("file:///C:/Users/example/secret.txt")).toBe(false);
    expect(isAllowedRichTextHref("https://example.com")).toBe(false);
    expect(isAllowedRichTextHref("http://example.com")).toBe(false);
  });

  it("allows local document links only", () => {
    expect(isAllowedRichTextHref("#local-section")).toBe(true);
    expect(isAllowedRichTextHref("/local-route")).toBe(true);
    expect(isAllowedRichTextHref("./relative-note")).toBe(true);
    expect(isAllowedRichTextHref("../relative-note")).toBe(true);
    expect(isAllowedRichTextHref("relative-note")).toBe(true);
  });
});

describe("HTML escaping helpers", () => {
  it("escapes text content without escaping quotes", () => {
    expect(escapeHtml(`<Goblin & "Torch">`)).toBe("&lt;Goblin &amp; \"Torch\"&gt;");
  });

  it("escapes attribute content including quotes", () => {
    expect(escapeHtmlAttribute(`Broken "Goblin" & <Torch>`)).toBe(
      "Broken &quot;Goblin&quot; &amp; &lt;Torch&gt;"
    );
  });
});

describe("stripSingleParagraphWrapper", () => {
  it("unwraps a single paragraph for inline stat-block ability text", () => {
    expect(stripSingleParagraphWrapper("<p>Claw attack.</p>")).toBe("Claw attack.");
  });

  it("preserves richer multi-block HTML", () => {
    const html = "<p>One.</p><p>Two.</p>";
    expect(stripSingleParagraphWrapper(html)).toBe(html);
  });
});
