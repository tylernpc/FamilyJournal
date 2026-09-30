import type { CropName, CropRect, Photo } from "./types";

// Where a photo shows decides which crop it uses:
//   post      in a post
//   avatar    round avatars; set first when someone crops a profile photo
//   portrait  the tree's portrait cards; without its own crop, framed around the avatar
// A portrait with no avatar (set before the circle came first) gives circles its middle square.
// Missing crops show the whole photo, which is also how photos from before crops existed behave.

// The middle square of a rectangle, for circles cut from a portrait
export function centerSquare(rect: CropRect, width: number, height: number): CropRect {
  const w = rect.width * width;
  const h = rect.height * height;
  const side = Math.min(w, h);
  return {
    x: rect.x + (w - side) / 2 / width,
    y: rect.y + (h - side) / 2 / height,
    width: side / width,
    height: side / height,
  };
}

// The tree's 10:13 card framed around a circle crop, for when nobody chose a portrait: a bit wider
// than the face, with the face above the middle the way a portrait sits, kept inside the photo.
export function portraitAround(circle: CropRect, width: number, height: number): CropRect {
  const side = circle.width * width;
  const cx = (circle.x + circle.width / 2) * width;
  const cy = (circle.y + circle.height / 2) * height;

  let w = Math.min(width, side * 1.6);
  let h = (w * 13) / 10;
  if (h > height) {
    h = height;
    w = (h * 10) / 13;
  }
  const left = Math.min(Math.max(0, cx - w / 2), width - w);
  const top = Math.min(Math.max(0, cy - h * 0.42), height - h);
  return { x: left / width, y: top / height, width: w / width, height: h / height };
}

export function cropFor(photo: Photo, name: CropName): CropRect | undefined {
  const crops = photo.crops;
  const sized = photo.width > 0 && photo.height > 0;
  if (name === "avatar") {
    if (crops?.avatar) return crops.avatar;
    if (crops?.portrait && sized) return centerSquare(crops.portrait, photo.width, photo.height);
    return undefined;
  }
  if (name === "portrait") {
    if (crops?.portrait) return crops.portrait;
    if (crops?.avatar && sized) return portraitAround(crops.avatar, photo.width, photo.height);
    return undefined;
  }
  return crops?.post;
}

const round = (n: number) => Math.round(n * 10000) / 10000;

// The photo as a given place should show it: a URL for just that crop (cut by /img on this server),
// with the crop's own size, so next/image lays it out and resizes it like any other photo.
export function frame(photo: Photo, name: CropName): Photo {
  const rect = cropFor(photo, name);
  // Local previews (blob: URLs) and unsigned URLs can't go through /img
  if (!rect || !photo.src.startsWith("/api/media/")) return photo;

  const [path, query] = photo.src.split("?");
  const c = [rect.x, rect.y, rect.width, rect.height].map(round).join(",");
  return {
    ...photo,
    src: `${path.replace("/api/media/", "/img/media/")}?${query}&c=${c}`,
    width: Math.max(1, Math.round((photo.width || 1000) * rect.width)),
    height: Math.max(1, Math.round((photo.height || 1000) * rect.height)),
    crops: undefined,
  };
}

// Near enough to the whole photo that storing a crop would change nothing
export function isWhole(rect: CropRect) {
  return rect.x < 0.002 && rect.y < 0.002 && rect.width > 0.996 && rect.height > 0.996;
}
