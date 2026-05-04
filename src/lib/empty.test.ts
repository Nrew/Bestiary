import { describe, expect, it } from "vitest";
import {
  hasItems,
  hasMeaningfulString,
  hasObjectKeys,
  hasRichTextContent,
} from "./empty";

describe("hasRichTextContent", () => {
  it("rejects nullish and whitespace", () => {
    expect(hasRichTextContent(undefined)).toBe(false);
    expect(hasRichTextContent(null)).toBe(false);
    expect(hasRichTextContent("")).toBe(false);
    expect(hasRichTextContent("   ")).toBe(false);
  });

  it("rejects TipTap-style empty paragraphs", () => {
    expect(hasRichTextContent("<p></p>")).toBe(false);
    expect(hasRichTextContent("  <p></p>  ")).toBe(false);
    expect(hasRichTextContent("<p><br></p>")).toBe(false);
    expect(hasRichTextContent("<p><br/></p>")).toBe(false);
    expect(hasRichTextContent("<p>&nbsp;</p>")).toBe(false);
  });

  it("accepts paragraphs with real text", () => {
    expect(hasRichTextContent("<p>hello</p>")).toBe(true);
    expect(hasRichTextContent("<p><strong>x</strong></p>")).toBe(true);
  });

  it("treats embedded media as content even with no text", () => {
    expect(hasRichTextContent('<p><img src="x.png" /></p>')).toBe(true);
    expect(hasRichTextContent('<video src="x.mp4"></video>')).toBe(true);
  });
});

describe("hasMeaningfulString", () => {
  it("only returns true for non-empty trimmed strings", () => {
    expect(hasMeaningfulString(undefined)).toBe(false);
    expect(hasMeaningfulString(null)).toBe(false);
    expect(hasMeaningfulString("")).toBe(false);
    expect(hasMeaningfulString("   ")).toBe(false);
    expect(hasMeaningfulString("a")).toBe(true);
    expect(hasMeaningfulString(" hello ")).toBe(true);
  });
});

describe("hasItems", () => {
  it("rejects empty and nullish", () => {
    expect(hasItems(undefined)).toBe(false);
    expect(hasItems(null)).toBe(false);
    expect(hasItems([])).toBe(false);
  });
  it("accepts non-empty arrays", () => {
    expect(hasItems([0])).toBe(true);
    expect(hasItems([""])).toBe(true);
    expect(hasItems([null])).toBe(true);
  });
});

describe("hasObjectKeys", () => {
  it("rejects empty and nullish", () => {
    expect(hasObjectKeys(undefined)).toBe(false);
    expect(hasObjectKeys(null)).toBe(false);
    expect(hasObjectKeys({})).toBe(false);
  });
  it("accepts populated objects", () => {
    expect(hasObjectKeys({ a: 1 })).toBe(true);
    expect(hasObjectKeys({ a: undefined })).toBe(true);
  });
});
