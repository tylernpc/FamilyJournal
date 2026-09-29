// The sign-in lives in two httpOnly cookies, so the tokens never reach browser JavaScript.
// Kept free of next/headers so proxy.ts can use it too.

import type { components } from "../api/schema";

type Tokens = components["schemas"]["AuthTokensModel"];

export const ACCESS_COOKIE = "fj_at";
export const REFRESH_COOKIE = "fj_rt";
// The family you last looked at, so "/" can take you back to it.
export const FAMILY_COOKIE = "fj_family";
export const TIMEZONE_COOKIE = "tz";

export const API_URL = process.env.API_URL ?? "http://localhost:5092";

// The access cookie expires a minute before the token does, so a request never carries a token that
// runs out mid-flight. Once it's gone, proxy.ts trades the refresh token for a new pair.
const ACCESS_MARGIN_SECONDS = 60;

type CookieSpec = {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

const secondsUntil = (iso: string) => Math.max(0, Math.floor((Date.parse(iso) - Date.now()) / 1000));

function spec(name: string, value: string, maxAge: number): CookieSpec {
  return {
    name,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function sessionCookies(tokens: Tokens): CookieSpec[] {
  return [
    spec(ACCESS_COOKIE, tokens.accessToken, secondsUntil(tokens.accessTokenExpiresAt) - ACCESS_MARGIN_SECONDS),
    spec(REFRESH_COOKIE, tokens.refreshToken, secondsUntil(tokens.refreshTokenExpiresAt)),
  ];
}

export function expiredSessionCookies(): CookieSpec[] {
  return [spec(ACCESS_COOKIE, "", 0), spec(REFRESH_COOKIE, "", 0)];
}

// Only same-site paths, so a crafted ?next= can't send someone elsewhere after signing in.
export function safeNext(next: unknown, fallback = "/") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : fallback;
}
