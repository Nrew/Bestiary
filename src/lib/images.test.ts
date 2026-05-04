import { describe, expect, it } from "vitest";
import { imageRefKey, isManagedImageRef } from "./images";

describe("managed image refs", () => {
  it("accepts bare managed image filenames", () => {
    expect(isManagedImageRef("550e8400-e29b-41d4-a716-446655440000.webp")).toBe(true);
    expect(isManagedImageRef("portrait.JPG")).toBe(true);
  });

  it("rejects paths, hidden files, empty values, and unsupported extensions", () => {
    expect(isManagedImageRef("")).toBe(false);
    expect(isManagedImageRef("../portrait.webp")).toBe(false);
    expect(isManagedImageRef("nested/portrait.webp")).toBe(false);
    expect(isManagedImageRef("nested\\portrait.webp")).toBe(false);
    expect(isManagedImageRef(".import_staging_x")).toBe(false);
    expect(isManagedImageRef("payload.svg")).toBe(false);
  });

  it("builds stable keys for duplicate refs", () => {
    expect(imageRefKey("same.webp", 0)).toBe("0:same.webp");
    expect(imageRefKey("same.webp", 1)).toBe("1:same.webp");
    expect(imageRefKey("same.webp", 0)).not.toBe(imageRefKey("same.webp", 1));
  });
});
