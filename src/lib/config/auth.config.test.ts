import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthConfig, rewriteConfiguredUrl } from "@/lib/config/auth.config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rewriteConfiguredUrl", () => {
  it("keeps the configured path and query on the current public origin", () => {
    expect(
      rewriteConfiguredUrl(
        "http://localhost:4200/auth-callback?to=signin",
        "https://termination-widescreen-dating-returned.trycloudflare.com",
        "/auth-callback?to=signin",
      ),
    ).toBe(
      "https://termination-widescreen-dating-returned.trycloudflare.com/auth-callback?to=signin",
    );
  });

  it("does not add a trailing slash to a root post-logout URL", () => {
    expect(
      rewriteConfiguredUrl(
        "http://localhost:4200",
        "https://kpi.trycloudflare.com",
        "",
      ),
    ).toBe("https://kpi.trycloudflare.com");
  });

  it("uses the fallback path when the configured URL is missing", () => {
    expect(
      rewriteConfiguredUrl(
        undefined,
        "https://kpi.trycloudflare.com",
        "/assets/silent-callback.html",
      ),
    ).toBe("https://kpi.trycloudflare.com/assets/silent-callback.html");
  });
});

describe("getAuthConfig", () => {
  it("points OIDC callback URLs at the current origin while keeping the authority", () => {
    vi.stubEnv("NEXT_PUBLIC_STS_AUTHORITY", "https://dev.id.eris.efda.gov.et");
    vi.stubEnv("NEXT_PUBLIC_CLIENT_ID", "eris-portal-spa");
    vi.stubEnv("NEXT_PUBLIC_REDIRECT_URI", "http://localhost:4200/auth-callback?to=signin");
    vi.stubEnv("NEXT_PUBLIC_SILENT_REDIRECT_URI", "http://localhost:4200/assets/silent-callback.html");
    vi.stubEnv("NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI", "http://localhost:4200");
    vi.stubEnv("NEXT_PUBLIC_CLIENT_SCOPE", "openid profile");
    vi.stubEnv("NEXT_PUBLIC_RESPONSE_TYPE", "code");

    const config = getAuthConfig("https://named-tunnel.trycloudflare.com");

    expect(config.authority).toBe("https://dev.id.eris.efda.gov.et");
    expect(config.redirect_uri).toBe(
      "https://named-tunnel.trycloudflare.com/auth-callback?to=signin",
    );
    expect(config.silent_redirect_uri).toBe(
      "https://named-tunnel.trycloudflare.com/assets/silent-callback.html",
    );
    expect(config.post_logout_redirect_uri).toBe("https://named-tunnel.trycloudflare.com");
  });
});
