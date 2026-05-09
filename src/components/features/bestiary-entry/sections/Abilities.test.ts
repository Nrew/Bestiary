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
});
