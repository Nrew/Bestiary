import { describe, expect, it } from "vitest";
import { buildAbilityHtml } from "./Abilities";

describe("buildAbilityHtml", () => {
  it("wraps name in bold italic and strips the paragraph wrapper from description", () => {
    const result = buildAbilityHtml("Regeneration", "<p>The troll regains <strong>10 hit points</strong>.</p>");
    expect(result).toBe(
      "<p><strong><em>Regeneration.</em></strong> The troll regains <strong>10 hit points</strong>.</p>"
    );
  });

  it("escapes HTML in the ability name to prevent injection", () => {
    const result = buildAbilityHtml("<script>alert(1)</script>", "<p>Description.</p>");
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("passes wiki-link spans through from the description untouched", () => {
    const wikiSpan = `<span class="wiki-link wiki-link--found" data-wiki-id="abc" data-wiki-type="statuses" role="link">Bleeding</span>`;
    const result = buildAbilityHtml("Crushing Slam", `<p>The target must succeed or become ${wikiSpan}.</p>`);
    expect(result).toContain(wikiSpan);
  });

  it("handles descriptions that have no paragraph wrapper", () => {
    const result = buildAbilityHtml("Bite", "Deals piercing damage.");
    expect(result).toBe("<p><strong><em>Bite.</em></strong> Deals piercing damage.</p>");
  });

  it("escapes ampersands and angle brackets in the name", () => {
    // `&` must be escaped before `<` / `>`, otherwise a literal `&lt;` in
    // the input becomes `&amp;lt;` (correct) instead of `&lt;` (wrong, would
    // render as text). The escape order in `escapeHtml` is load-bearing.
    const result = buildAbilityHtml("Cleaver & Smash <Ultra>", "<p>Strike.</p>");
    expect(result).toContain("Cleaver &amp; Smash &lt;Ultra&gt;");
    expect(result).not.toContain("<Ultra>");
  });

  it("does not escape quotes in the name (text-only escape)", () => {
    // `escapeHtml` is for text content, not attribute values. Quotes in the
    // visible name should pass through; only attribute-bound rendering would
    // require `escapeHtmlAttribute`.
    const result = buildAbilityHtml(`He said "go"`, "<p>Test.</p>");
    expect(result).toContain(`He said "go"`);
  });
});
