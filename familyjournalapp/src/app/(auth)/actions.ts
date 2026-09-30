"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { components } from "@/lib/api/schema";
import { ApiError, api, unwrap } from "@/lib/server/api";
import { REFRESH_COOKIE, expiredSessionCookies, safeNext, sessionCookies } from "@/lib/server/session-cookies";

type Tokens = components["schemas"]["AuthTokensModel"];

export type AuthFormState = { error?: string; values?: Record<string, string> };

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

async function saveSession(tokens: Tokens) {
  const jar = await cookies();
  for (const cookie of sessionCookies(tokens)) jar.set(cookie);
}

export async function signIn(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = text(form, "email");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", values: { email } };

  try {
    await saveSession(await unwrap(api.POST("/api/auth/login", { body: { email, password } })));
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, values: { email } };
    throw error;
  }
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const values = {
    firstName: text(form, "firstName"),
    lastName: text(form, "lastName"),
    email: text(form, "email"),
  };
  const password = String(form.get("password") ?? "");
  if (!values.firstName || !values.lastName) return { error: "Add your first and last name.", values };
  if (password.length < 10) return { error: "Use at least 10 characters for your password.", values };

  try {
    await saveSession(await unwrap(api.POST("/api/auth/register", { body: { ...values, password } })));
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, values };
    throw error;
  }
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    // Revokes the session on the API too; signing out here should work even if that fails
    await api.POST("/api/auth/logout", { body: { refreshToken } }).catch(() => undefined);
  }
  for (const cookie of expiredSessionCookies()) jar.set(cookie);
  redirect("/login");
}
