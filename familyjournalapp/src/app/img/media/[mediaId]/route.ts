import { type NextRequest } from "next/server";
import sharp from "sharp";
import { isGuid } from "@/lib/server/api";
import { API_URL } from "@/lib/server/session-cookies";

// One crop of a stored photo: /img/media/{id}?expires=…&sig=…&c=x,y,width,height (fractions of the photo).
// The signature is checked by the API when the original is fetched, so this is only as open as the
// photo's own signed URL. next/image then resizes the result and caches it per screen size.

// Big enough for a full-width post on a sharp phone; next/image scales down from here
const MAX_SIDE = 2400;

function parseCrop(value: string | null) {
  const numbers = value?.split(",").map(Number);
  if (!numbers || numbers.length !== 4 || numbers.some((n) => !Number.isFinite(n) || n < 0 || n > 1)) return null;
  const [x, y, width, height] = numbers;
  if (width <= 0 || height <= 0 || x + width > 1.001 || y + height > 1.001) return null;
  return { x, y, width, height };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const query = request.nextUrl.searchParams;
  const crop = parseCrop(query.get("c"));
  if (!isGuid(mediaId) || !crop) return new Response(null, { status: 404 });

  const signed = new URLSearchParams({ expires: query.get("expires") ?? "", sig: query.get("sig") ?? "" });
  const upstream = await fetch(`${API_URL}/api/media/${mediaId}?${signed}`, { cache: "no-store" }).catch(() => null);
  if (!upstream?.ok) return new Response(null, { status: upstream?.status === 404 ? 404 : 502 });

  const original = Buffer.from(await upstream.arrayBuffer());
  const headers = { "Cache-Control": "private, max-age=3600" };

  try {
    const image = sharp(original, { failOn: "none" });
    const meta = await image.metadata();
    // Crops are measured on the photo as it's viewed, after any camera rotation
    const turned = (meta.orientation ?? 1) >= 5;
    const width = (turned ? meta.height : meta.width) ?? 0;
    const height = (turned ? meta.width : meta.height) ?? 0;

    const left = Math.min(width - 1, Math.max(0, Math.round(crop.x * width)));
    const top = Math.min(height - 1, Math.max(0, Math.round(crop.y * height)));
    const region = {
      left,
      top,
      width: Math.max(1, Math.min(width - left, Math.round(crop.width * width))),
      height: Math.max(1, Math.min(height - top, Math.round(crop.height * height))),
    };

    const cropped = await image
      .rotate()
      .extract(region)
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return new Response(new Uint8Array(cropped), { headers: { ...headers, "Content-Type": "image/jpeg" } });
  } catch {
    // A format this server can't decode (HEIC, usually): show the whole photo rather than nothing
    return new Response(new Uint8Array(original), {
      headers: { ...headers, "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream" },
    });
  }
}
