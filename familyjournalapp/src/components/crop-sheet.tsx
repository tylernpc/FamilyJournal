"use client";

import { useState } from "react";
import Cropper from "react-easy-crop";
import { centerSquare, portraitAround } from "@/lib/photo";
import type { CropRect, PhotoCrops } from "@/lib/types";
import { Sheet, SheetHeader } from "./sheet";

// A shape to crop to. No ratio means the photo's own.
export type CropShape = { label: string; ratio?: number };

export const POST_SHAPES: CropShape[] = [
  { label: "Original" },
  { label: "Portrait", ratio: 4 / 5 },
  { label: "Square", ratio: 1 },
  { label: "Landscape", ratio: 4 / 3 },
];

// Profile photos show as the tree's portrait cards
const PORTRAIT: CropShape = { label: "Portrait", ratio: 10 / 13 };
const CIRCLE: CropShape = { label: "Circle", ratio: 1 };

// Part of a photo, filling its box the way object-fit: cover would (centered, never stretched).
// For previews while cropping, including photos that haven't uploaded yet; everywhere else uses
// frame() from lib/photo. `width` and `height` are the whole photo's.
export function CroppedImage({
  src,
  rect,
  width,
  height,
  className,
}: {
  src: string;
  rect?: CropRect;
  width: number;
  height: number;
  className: string;
}) {
  const r = rect ?? { x: 0, y: 0, width: 1, height: 1 };
  const w = width || 1000;
  const h = height || 1000;
  return (
    <svg
      aria-hidden="true"
      viewBox={`${r.x * w} ${r.y * h} ${r.width * w} ${r.height * h}`}
      preserveAspectRatio="xMidYMid slice"
      className={`block shrink-0 bg-sunken ${className}`}
    >
      <image href={src} width={w} height={h} preserveAspectRatio="none" />
    </svg>
  );
}

const asPercent = (r: CropRect) => ({ x: r.x * 100, y: r.y * 100, width: r.width * 100, height: r.height * 100 });
const asFraction = (r: { x: number; y: number; width: number; height: number }): CropRect => ({
  x: r.x / 100,
  y: r.y / 100,
  width: r.width / 100,
  height: r.height / 100,
});

// Drag to move, pinch or use the slider to zoom. Reports the chosen area as fractions of the photo.
export function CropSheet({
  src,
  shapes,
  initial,
  initialShape,
  title = "Crop",
  round = false,
  left,
  children,
  onCancel,
  onDone,
}: {
  src: string;
  shapes: CropShape[];
  initial?: CropRect;
  initialShape?: string;
  title?: string;
  // Crop through a round window
  round?: boolean;
  // Replaces Cancel in the header
  left?: React.ReactNode;
  // Shown under the photo, given the crop as it moves
  children?: (rect: CropRect | undefined, natural: { width: number; height: number } | undefined) => React.ReactNode;
  onCancel: () => void;
  onDone: (rect: CropRect, shape: string) => void;
}) {
  const [shape, setShape] = useState(shapes.find((s) => s.label === initialShape) ?? shapes[0]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [natural, setNatural] = useState<{ width: number; height: number }>();
  const [rect, setRect] = useState<CropRect>();
  // Starting position only applies until they change the shape
  const [start, setStart] = useState(initial);

  const ratio = shape.ratio ?? (natural ? natural.width / natural.height : 1);

  return (
    <Sheet label={title} onClose={onCancel} wide>
      <SheetHeader
        title={title}
        left={
          left ?? (
            <button onClick={onCancel} className="h-8 text-[15px]">
              Cancel
            </button>
          )
        }
        right={
          <button
            onClick={() => rect && onDone(rect, shape.label)}
            disabled={!rect}
            className="h-8 rounded-full bg-ink px-4 text-[14px] font-semibold text-canvas disabled:opacity-25"
          >
            Done
          </button>
        }
      />
      <div className="relative h-[min(56dvh,520px)] shrink-0 bg-black">
        <Cropper
          key={shape.label}
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={ratio}
          maxZoom={5}
          cropShape={round ? "round" : "rect"}
          showGrid={!round}
          zoomWithScroll
          objectFit="contain"
          initialCroppedAreaPercentages={start ? asPercent(start) : undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropAreaChange={(area) => setRect(asFraction(area))}
          onCropComplete={(area) => setRect(asFraction(area))}
          onMediaLoaded={(media) => setNatural({ width: media.naturalWidth, height: media.naturalHeight })}
        />
      </div>
      <div className="space-y-4 px-4 pb-5 pt-4">
        {children?.(rect, natural)}
        <label className="flex items-center gap-3">
          <span className="text-[13px] font-semibold">Zoom</span>
          <input
            type="range"
            min={1}
            max={5}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1 flex-1 accent-[var(--ink)]"
          />
        </label>
        {shapes.length > 1 && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="radiogroup" aria-label="Shape">
            {shapes.map((s) => (
              <button
                key={s.label}
                role="radio"
                aria-checked={s.label === shape.label}
                onClick={() => {
                  setShape(s);
                  setStart(undefined);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                }}
                className={`h-9 shrink-0 rounded-full px-4 text-[14px] ${
                  s.label === shape.label ? "bg-ink font-semibold text-canvas" : "bg-sunken text-ink-2 hover:bg-hover"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

type Size = { width: number; height: number };

// A profile picture starts with the circle, which is what people see most. The tree's portrait is
// optional: until it's set, it's framed around the circle (portraitAround in lib/photo).
export function ProfilePhotoCropper({
  src,
  initial,
  initialStep = "circle",
  onCancel,
  onDone,
}: {
  src: string;
  initial?: PhotoCrops;
  initialStep?: "circle" | "portrait";
  onCancel: () => void;
  onDone: (crops: PhotoCrops) => void;
}) {
  const [natural, setNatural] = useState<Size>();
  const [step, setStep] = useState(initialStep);
  // Where the circle was when they went to adjust the portrait, so it comes back the same
  const [avatar, setAvatar] = useState(initial?.avatar);
  // Only set when they choose one
  const [portrait, setPortrait] = useState(initial?.portrait);

  // The defaults below need the photo's size, so read it before showing either step
  if (!natural) {
    return (
      <Sheet label="Crop photo" onClose={onCancel} wide>
        {/* eslint-disable-next-line @next/next/no-img-element -- only read for its size */}
        <img
          src={src}
          alt=""
          className="hidden"
          onLoad={(e) => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
        />
        <p className="px-4 py-10 text-center text-[14px] text-ink-3">Loading photo…</p>
      </Sheet>
    );
  }

  // Each step shows the other shape small underneath, with a link across. Switching keeps where
  // both crops were; Done on either step saves both.
  const link = "font-semibold text-ink underline underline-offset-4";

  if (step === "portrait") {
    const around = avatar ?? (portrait && centerSquare(portrait, natural.width, natural.height));
    return (
      <CropSheet
        key="portrait"
        title="Tree card"
        src={src}
        shapes={[PORTRAIT]}
        initial={portrait ?? (around && portraitAround(around, natural.width, natural.height))}
        onCancel={onCancel}
        onDone={(rect) => onDone({ avatar: around, portrait: rect })}
      >
        {(rect) =>
          rect && (
            <div className="flex items-center gap-3">
              {around && <CroppedImage src={src} rect={around} {...natural} className="h-[52px] w-[52px] rounded-full" />}
              <div className="min-w-0 text-[13px] leading-snug text-ink-3">
                Profile circle.{" "}
                <button
                  onClick={() => {
                    setPortrait(rect);
                    setStep("circle");
                  }}
                  className={link}
                >
                  Adjust circle
                </button>
              </div>
            </div>
          )
        }
      </CropSheet>
    );
  }

  return (
    <CropSheet
      key="circle"
      title="Profile photo"
      src={src}
      shapes={[CIRCLE]}
      round
      initial={avatar ?? (portrait && centerSquare(portrait, natural.width, natural.height))}
      onCancel={onCancel}
      onDone={(rect) => onDone({ avatar: rect, portrait })}
    >
      {(rect) =>
        rect && (
          <div className="flex items-center gap-3">
            <CroppedImage
              src={src}
              rect={portrait ?? portraitAround(rect, natural.width, natural.height)}
              {...natural}
              className="aspect-[10/13] w-[40px] rounded-[3px]"
            />
            <div className="min-w-0 text-[13px] leading-snug text-ink-3">
              {portrait ? "Tree card set. " : "The tree card follows the circle. "}
              <button
                onClick={() => {
                  setAvatar(rect);
                  setStep("portrait");
                }}
                className={link}
              >
                Adjust
              </button>
              {portrait && (
                <>
                  {" · "}
                  <button onClick={() => setPortrait(undefined)} className={link}>
                    Follow the circle
                  </button>
                </>
              )}
            </div>
          </div>
        )
      }
    </CropSheet>
  );
}
