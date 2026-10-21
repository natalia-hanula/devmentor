import { describe, expect, it } from "vitest";
import { clientIp, UNKNOWN_CLIENT_IP } from "../src";

function requestWith(forwardedFor?: string): Request {
  const headers = new Headers();
  if (forwardedFor !== undefined) {
    headers.set("x-forwarded-for", forwardedFor);
  }
  return new Request("http://localhost/api/auth/login", { headers });
}

describe("clientIp", () => {
  it("zwraca jedyny adres z x-forwarded-for", () => {
    expect(clientIp(requestWith("203.0.113.7"))).toBe("203.0.113.7");
  });

  it("przy kilku adresach bierze ostatni (dopisany przez reverse proxy), nie pierwszy od klienta", () => {
    expect(clientIp(requestWith("10.0.0.1, 198.51.100.2, 203.0.113.7"))).toBe("203.0.113.7");
  });

  it("przycina spacje wokół adresu", () => {
    expect(clientIp(requestWith("  10.0.0.1 ,   203.0.113.7  "))).toBe("203.0.113.7");
  });

  it("bez nagłówka zwraca stałą unknown", () => {
    expect(clientIp(requestWith())).toBe(UNKNOWN_CLIENT_IP);
    expect(UNKNOWN_CLIENT_IP).toBe("unknown");
  });

  it("dla pustego nagłówka lub pustego ostatniego wpisu zwraca unknown", () => {
    expect(clientIp(requestWith(""))).toBe(UNKNOWN_CLIENT_IP);
    expect(clientIp(requestWith("   "))).toBe(UNKNOWN_CLIENT_IP);
    expect(clientIp(requestWith("203.0.113.7, "))).toBe(UNKNOWN_CLIENT_IP);
  });
});
