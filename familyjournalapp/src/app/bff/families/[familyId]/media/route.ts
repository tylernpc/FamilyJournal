import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { isGuid } from "@/lib/server/api";
import { ACCESS_COOKIE, API_URL } from "@/lib/server/session-cookies";

// Photo uploads go through here rather than a server action: actions cap request bodies at 1 MB, and
// this streams the form straight through to the API with the visitor's token attached.
export async function POST(request: NextRequest, { params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ title: "Sign in again to upload photos." }, { status: 401 });
  if (!isGuid(familyId)) return NextResponse.json({ title: "Not found." }, { status: 404 });

  const forwardedFor = request.headers.get("x-forwarded-for");
  const response = await fetch(`${API_URL}/api/families/${familyId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": request.headers.get("content-type") ?? "",
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
    body: request.body,
    // @ts-expect-error -- Node's fetch needs this to send a streamed body; the DOM types don't know it
    duplex: "half",
    cache: "no-store",
  }).catch(() => null);

  if (!response) return NextResponse.json({ title: "Can't reach Family Journal right now." }, { status: 503 });
  return new NextResponse(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}
