"use client";

import Image from "next/image";
import Link from "next/link";
import { fullName } from "@/lib/family";
import { useFamily } from "@/lib/family-context";

// Same portrait treatment as the tree: the photo is the card, name underneath.
export function PortraitCard({
  personId,
  caption,
  width = 160,
}: {
  personId: string;
  caption?: string;
  width?: number;
}) {
  const { graph, href } = useFamily();
  const person = graph.getPerson(personId);
  const height = Math.round(width * 1.3);

  return (
    <Link href={href(`/people/${personId}`)} className="group block min-w-0">
      <span className="relative block aspect-[10/13] overflow-hidden rounded-[4px] bg-sunken">
        {person.photo ? (
          <Image
            src={person.photo.src}
            alt={fullName(person)}
            width={width}
            height={height}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
              person.lifeStatus === "deceased" ? "grayscale" : ""
            }`}
          />
        ) : (
          <span className="display flex h-full items-center justify-center text-[40px] text-ink-3">
            {person.firstName[0]}
          </span>
        )}
      </span>
      <span className="mt-2 block truncate text-[15px] font-semibold leading-tight">
        {fullName(person)}
      </span>
      {caption && <span className="mt-0.5 block truncate text-[13px] text-ink-3">{caption}</span>}
    </Link>
  );
}
