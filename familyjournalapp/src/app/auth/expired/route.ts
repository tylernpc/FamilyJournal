import { NextResponse, type NextRequest } from "next/server";
import { expiredSessionCookies } from "@/lib/server/session-cookies";

// Where pages send people when the API turns their sign-in down: clears the cookies (pages can't),
// then on to the sign-in page. Without this, /login would see the cookie and bounce them back.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  for (const cookie of expiredSessionCookies()) response.cookies.set(cookie);
  return response;
}
