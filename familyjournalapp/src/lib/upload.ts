"use client";

import { toCrops } from "./api/map";
import type { Photo, PhotoCrops } from "./types";

// A picked file as a local preview, with the pixel size the API asks for.
export function readPhoto(file: File): Promise<Photo> {
  const src = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ src, alt: "", width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`${file.name} isn't a photo this browser can open.`));
    img.src = src;
  });
}

// Uploads the whole photo to the family, with how to frame it if already known.
// The result's mediaId can go on a post or a profile.
export async function uploadPhoto(familyId: string, file: File, preview: Photo, crops?: PhotoCrops): Promise<Photo> {
  const form = new FormData();
  form.append("file", file);
  form.append("width", String(preview.width));
  form.append("height", String(preview.height));
  if (crops) form.append("crops", JSON.stringify(crops));

  const response = await fetch(`/bff/families/${familyId}/media`, { method: "POST", body: form }).catch(
    () => null,
  );
  if (!response) throw new Error("Couldn't upload. Check your connection and try again.");
  if (response.status === 413) throw new Error(`${file.name} is too big. Photos can be up to 15 MB.`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.title ?? "Couldn't upload that photo.");

  return { mediaId: body.id, src: body.url, alt: "", width: body.width, height: body.height, crops: toCrops(body.crops) };
}
