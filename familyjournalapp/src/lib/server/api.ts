import "server-only";

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import createClient from "openapi-fetch";
import type { paths } from "../api/schema";
import { ACCESS_COOKIE, API_URL } from "./session-cookies";

// Typed client for the .NET API, used only on this server. It signs each call with the
// access token from the visitor's cookie and passes their address on for the API's rate limits.
export const api = createClient<paths>({ baseUrl: API_URL, cache: "no-store" });

api.use({
  async onRequest({ request }) {
    const token = (await cookies()).get(ACCESS_COOKIE)?.value;
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    const forwardedFor = (await headers()).get("x-forwarded-for");
    if (forwardedFor) request.headers.set("X-Forwarded-For", forwardedFor);
    return request;
  },
});

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const FALLBACK: Record<number, string> = {
  400: "Something about that didn't look right.",
  403: "You don't have permission to do that.",
  404: "That's no longer here.",
  409: "Someone got there first. Refresh and try again.",
  429: "Too many tries. Wait a minute and try again.",
};

function toError(status: number, body: unknown) {
  const problem = body as { title?: string; errors?: Record<string, string[]> } | undefined;
  // Validation errors put the useful part in "errors"
  const firstError = problem?.errors && Object.values(problem.errors)[0]?.[0];
  const message =
    firstError ??
    (problem?.title && problem.title !== "One or more validation errors occurred." ? problem.title : undefined) ??
    FALLBACK[status] ??
    "Something went wrong on our end. Try again in a moment.";
  return new ApiError(status, message);
}

type Result<T> = { data?: T; error?: unknown; response: Response };

// The data, or an ApiError with a message fit to show people.
export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await call;
  } catch (error) {
    // fetch reports an unreachable API as a TypeError. Anything else (including Next's own signals,
    // like the one that marks a page as reading cookies) must pass through untouched.
    if (error instanceof TypeError) {
      throw new ApiError(503, "Can't reach Family Journal right now. Try again in a moment.");
    }
    throw error;
  }
  if (!result.response.ok) throw toError(result.response.status, result.error);
  return result.data as T;
}

// For pages and layouts: signed out goes to the sign-in page, and anything missing (or in a family
// you're not part of, which the API also reports as missing) shows the not-found page.
export async function load<T>(call: Promise<Result<T>>): Promise<T> {
  try {
    return await unwrap(call);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/auth/expired");
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// For server actions: failures come back as a message for the form instead of an error page.
export async function attempt<T>(work: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect("/auth/expired");
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isGuid = (value: unknown): value is string => typeof value === "string" && GUID.test(value);
