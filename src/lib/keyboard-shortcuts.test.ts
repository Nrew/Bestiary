import { describe, expect, it } from "vitest";
import { parseShortcut, eventMatchesShortcut } from "./keyboard-shortcuts";

const ev = (over: Partial<KeyboardEvent>): Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "key"> => ({
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  key: "s",
  ...over,
});

describe("eventMatchesShortcut", () => {
  it("fires ctrl+ shortcuts via Cmd on macOS, not via Ctrl", () => {
    const parsed = parseShortcut("ctrl+s");
    expect(eventMatchesShortcut(ev({ metaKey: true }), parsed, true)).toBe(true);
    expect(eventMatchesShortcut(ev({ ctrlKey: true }), parsed, true)).toBe(false);
  });

  it("fires ctrl+ shortcuts via Ctrl off macOS, not via the Windows/meta key", () => {
    const parsed = parseShortcut("ctrl+s");
    expect(eventMatchesShortcut(ev({ ctrlKey: true }), parsed, false)).toBe(true);
    expect(eventMatchesShortcut(ev({ metaKey: true }), parsed, false)).toBe(false);
  });

  it("matches alt-based shortcuts on either platform", () => {
    const parsed = parseShortcut("alt+arrowleft");
    expect(eventMatchesShortcut(ev({ altKey: true, key: "ArrowLeft" }), parsed, true)).toBe(true);
    expect(eventMatchesShortcut(ev({ altKey: true, key: "ArrowLeft" }), parsed, false)).toBe(true);
  });

  it("requires no primary modifier for unmodified keys", () => {
    const parsed = parseShortcut("escape");
    expect(eventMatchesShortcut(ev({ key: "Escape" }), parsed, true)).toBe(true);
    expect(eventMatchesShortcut(ev({ key: "Escape", metaKey: true }), parsed, true)).toBe(false);
  });
});
