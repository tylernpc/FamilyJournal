import type { Metadata } from "next";
import { PeopleList } from "@/components/people-list";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return <PeopleList />;
}
