import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/server/family";
import { FAMILY_COOKIE } from "@/lib/server/session-cookies";

// Sends you to the family you last looked at, or to starting one.
export default async function Home() {
  const account = await getAccount();
  if (!account.families.length) redirect("/welcome");

  const last = (await cookies()).get(FAMILY_COOKIE)?.value;
  const family = account.families.find((f) => f.familyId === last) ?? account.families[0];
  redirect(`/f/${family.familyId}`);
}
