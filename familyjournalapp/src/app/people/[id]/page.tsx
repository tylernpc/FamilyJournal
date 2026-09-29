import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { people } from "@/lib/data";
import { findPerson, fullName } from "@/lib/family";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return people.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = findPerson((await params).id);
  return { title: person ? fullName(person) : "Not found" };
}

export default async function PersonPage({ params }: Props) {
  const { id } = await params;
  if (!findPerson(id)) notFound();
  return <ProfileView id={id} />;
}
