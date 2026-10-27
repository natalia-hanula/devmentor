import { describe, expect, it } from "vitest";
import { safeNextPath } from "../src";

describe("safeNextPath", () => {
  it.each([
    ["/"],
    ["/admin"],
    ["/admin/technologies"],
    ["/admin?tab=1&x=a%2Fb"],
    ["/invite#token=abc"],
    ["/ścieżka/z-polskimi-znakami"],
  ])("przepuszcza ścieżkę względną %s", (value) => {
    expect(safeNextPath(value)).toBe(value);
  });

  it.each([
    ["//evil.pl"],
    ["///evil.pl"],
    ["/\\evil.pl"],
    ["\\\\evil.pl"],
    ["/\tevil.pl"],
    ["/\t/evil.pl"],
    ["/\n/evil.pl"],
    ["/\r/evil.pl"],
    ["/\u0000/evil.pl"],
    ["/ok\\..\\evil"],
    ["/\u007f"],
    ["https://evil.pl"],
    ["http://evil.pl/admin"],
    ["javascript:alert(1)"],
    ["data:text/html,x"],
    ["evil.pl"],
    ["admin"],
    [" /admin"],
    [""],
  ])("odrzuca złośliwą wartość %j i wraca na /", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("brak wartości daje /", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});
