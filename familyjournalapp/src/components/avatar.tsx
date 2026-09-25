import Image from "next/image";
import { fullName, getPerson, initials, photoUrl } from "@/lib/family";

const TONES = 6;

function toneFor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (hash % TONES) + 1;
}

export function Avatar({
  personId,
  size = 36,
  activity = false,
  className = "",
}: {
  personId: string;
  size?: number;
  activity?: boolean;
  className?: string;
}) {
  const person = getPerson(personId);
  const deceased = person.lifeStatus === "deceased";
  const src = photoUrl(person, size);

  return (
    <span
      className={`relative inline-flex shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={fullName(person)}
          width={size}
          height={size}
          className={`h-full w-full rounded-full bg-sunken object-cover ${deceased ? "grayscale" : ""}`}
        />
      ) : (
        <span
          className="flex h-full w-full select-none items-center justify-center rounded-full font-medium"
          style={{
            background: `var(--tone-${toneFor(personId)})`,
            color: "var(--tone-ink)",
            fontSize: Math.round(size * 0.36),
          }}
          aria-hidden="true"
        >
          {initials(person)}
        </span>
      )}
      {activity && (
        <span
          className="absolute rounded-full border-2 border-surface bg-signal"
          style={{
            width: Math.max(9, size * 0.26),
            height: Math.max(9, size * 0.26),
            right: -1,
            bottom: -1,
          }}
          title="In a post this week"
        />
      )}
    </span>
  );
}
