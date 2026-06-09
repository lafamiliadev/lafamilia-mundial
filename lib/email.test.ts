import { describe, expect, it } from "vitest";
import { brandedFrom, FROM_NAME } from "./email-from";

describe("brandedFrom", () => {
  it("forces the branded display name when EMAIL_FROM is a bare address", () => {
    expect(brandedFrom("noreply@wc26.lafamiliafoundation.com")).toBe(
      "La Copa de LaFamilia <noreply@wc26.lafamiliafoundation.com>",
    );
  });

  it("rebrands the display name even if EMAIL_FROM already has one (incl. 'wc26')", () => {
    expect(brandedFrom("wc26 <noreply@wc26.lafamiliafoundation.com>")).toBe(
      "La Copa de LaFamilia <noreply@wc26.lafamiliafoundation.com>",
    );
  });

  it("keeps the configured address and trims whitespace", () => {
    expect(brandedFrom("  Anything <hi@example.com>  ")).toBe("La Copa de LaFamilia <hi@example.com>");
  });

  it("always uses the brand name", () => {
    expect(FROM_NAME).toBe("La Copa de LaFamilia");
    expect(brandedFrom("x@y.com").startsWith("La Copa de LaFamilia <")).toBe(true);
  });
});
