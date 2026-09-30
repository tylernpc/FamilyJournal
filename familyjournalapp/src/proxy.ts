import { NextResponse, type NextRequest } from "next/server";
import type { components } from "@/lib/api/schema";
import {
  ACCESS_COOKIE,
  API_URL,
  FAMILY_COOKIE,
  REFRESH_COOKIE,
  expiredSessionCookies,
  sessionCookies,
} from "@/lib/server/session-cookies";

type Tokens = components["schemas"]["AuthTokensModel"];

// Pages that work signed out.
const PUBLIC = [/^\/login$/, /^\/signup$/, /^\/invite\/[^/]+$/, /^\/auth\/expired$/];
const SIGNED_OUT_ONLY = ["/login", "/signup"];

// A page load fires several requests at once (the page, prefetches, actions). The first to find an
// expired access token refreshes; the rest share its result. Presenting the same refresh token twice
// would look like theft to the API, which then signs the person out everywhere.
const refreshing = new Map<string, Promise<Tokens | null>>();

function refreshOnce(refreshToken: string, forwardedFor: string | null) {
  let pending = refreshing.get(refreshToken);
  if (!pending) {
    pending = refresh(refreshToken, forwardedFor);
    refreshing.set(refreshToken, pending);
    setTimeout(() => refreshing.delete(refreshToken), 30_000);
  }
  return pending;
}

async function refresh(refreshToken: string, forwardedFor: string | null): Promise<Tokens | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as Tokens) : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let signedIn = request.cookies.has(ACCESS_COOKIE);
  let renewed: Tokens | null = null;
  let expired = false;

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!signedIn && refreshToken) {
    renewed = await refreshOnce(refreshToken, request.headers.get("x-forwarded-for"));
    if (renewed) {
      // So the page rendering this request already sees the new token
      request.cookies.set(ACCESS_COOKIE, renewed.accessToken);
      request.cookies.set(REFRESH_COOKIE, renewed.refreshToken);
      signedIn = true;
    } else {
      request.cookies.delete(REFRESH_COOKIE);
      expired = true;
    }
  }

  let response: NextResponse;
  if (!signedIn && request.method === "GET" && !PUBLIC.some((p) => p.test(pathname))) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(login);
  } else if (signedIn && request.method === "GET" && SIGNED_OUT_ONLY.includes(pathname)) {
    response = NextResponse.redirect(new URL("/", request.url));
  } else {
    response = NextResponse.next({ request: { headers: request.headers } });
  }

  if (renewed) for (const cookie of sessionCookies(renewed)) response.cookies.set(cookie);
  if (expired) for (const cookie of expiredSessionCookies()) response.cookies.set(cookie);

  const family = /^\/f\/([0-9a-f-]{36})(\/|$)/i.exec(pathname)?.[1];
  if (family && request.cookies.get(FAMILY_COOKIE)?.value !== family) {
    response.cookies.set(FAMILY_COOKIE, family, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }

  return response;
}

export const config = {
  // Everything except static files and photos (photos and their crops are signed URLs and need no sign-in).
  matcher: ["/((?!_next/static|_next/image|api/media|img/media|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
