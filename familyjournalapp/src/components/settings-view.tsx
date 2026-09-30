"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signOut } from "@/app/(auth)/actions";
import { renameFamily, resendInvite, revokeInvite, setRole } from "@/app/f/[familyId]/actions";
import { fullName, relativeTime } from "@/lib/family";
import { useClock, useFamily } from "@/lib/family-context";
import type { Invite, MemberRole } from "@/lib/types";
import { Avatar } from "./avatar";
import { inputClass } from "./form";
import { CheckIcon, ChevronRightIcon, LinkIcon } from "./icons";
import { InviteSheet } from "./person-sheets";

type Member = { profileId: string; role: MemberRole; joinedAt: string };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Problem({ children }: { children?: string }) {
  return children ? <p className="px-4 pt-2 text-[13px] text-danger">{children}</p> : null;
}

export function SettingsView({ members, invites }: { members: Member[]; invites: Invite[] }) {
  const { family, families, viewer, isAdmin } = useFamily();
  const [inviting, setInviting] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[600px] pb-16 pt-6 lg:pt-10">
      <h1 className="display px-4 text-[40px]">Settings</h1>

      <Section title="Family">
        <FamilyName />
      </Section>

      <Section title={`Members · ${members.length}`}>
        <ul className="divide-y divide-line border-y border-line">
          {members.map((m) => (
            <MemberRow key={m.profileId} member={m} lastAdmin={m.role === "admin" && members.filter((x) => x.role === "admin").length === 1} />
          ))}
        </ul>
        {!isAdmin && <p className="px-4 pt-2 text-[13px] text-ink-3">Admins can change who else is an admin.</p>}
      </Section>

      <Section title="Waiting to join">
        {invites.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {invites.map((invite) => (
              <InviteRow key={invite.id} invite={invite} />
            ))}
          </ul>
        ) : (
          <p className="px-4 text-[15px] text-ink-3">No open invites.</p>
        )}
        <div className="px-4 pt-3">
          <button
            onClick={() => setInviting(true)}
            className="h-10 rounded-full bg-ink px-5 text-[14px] font-semibold text-canvas hover:bg-accent-hover"
          >
            Invite someone
          </button>
        </div>
      </Section>

      <Section title="Your families">
        <ul className="divide-y divide-line border-y border-line">
          {families.map((f) => (
            <li key={f.id}>
              <Link href={`/f/${f.id}`} className="flex h-13 items-center gap-3 px-4 hover:bg-hover">
                <span className="flex-1 text-[15px]">{f.name}</span>
                {f.id === family.id ? (
                  <CheckIcon size={18} strokeWidth={2} />
                ) : (
                  <ChevronRightIcon size={18} className="text-ink-3" />
                )}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/welcome" className="flex h-13 items-center px-4 text-[15px] text-ink-2 hover:bg-hover">
              Start another family
            </Link>
          </li>
        </ul>
      </Section>

      <Section title="Account">
        <div className="px-4">
          <p className="text-[15px]">
            Signed in as <span className="font-semibold">{viewer.email}</span>
          </p>
          <form action={signOut} className="mt-4">
            <button className="h-10 rounded-full border border-ink px-5 text-[14px] font-semibold hover:bg-hover">
              Sign out
            </button>
          </form>
        </div>
      </Section>

      {inviting && <InviteSheet onClose={() => setInviting(false)} />}
    </div>
  );
}

function FamilyName() {
  const { family, isAdmin } = useFamily();
  const [name, setName] = useState(family.name);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!isAdmin) return <p className="px-4 text-[15px]">{family.name}</p>;

  return (
    <form
      className="px-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await renameFamily(family.id, name);
          setError(result.ok ? undefined : result.error);
          setSaved(result.ok);
        });
      }}
    >
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          maxLength={200}
          aria-label="Family name"
          className={inputClass}
        />
        <button
          disabled={pending || !name.trim() || name.trim() === family.name}
          className="h-11 shrink-0 rounded-full bg-ink px-5 text-[14px] font-semibold text-canvas disabled:opacity-25"
        >
          {pending ? "Saving…" : saved ? "Saved" : "Rename"}
        </button>
      </div>
      {error && <p className="pt-2 text-[13px] text-danger">{error}</p>}
    </form>
  );
}

function MemberRow({ member, lastAdmin }: { member: Member; lastAdmin: boolean }) {
  const { family, me, graph, isAdmin, href } = useFamily();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const person = graph.getPerson(member.profileId);
  const next: MemberRole = member.role === "admin" ? "member" : "admin";

  return (
    <li>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Link href={href(`/people/${member.profileId}`)} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar personId={member.profileId} size={40} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-medium">
              {fullName(person)}
              {member.profileId === me && <span className="text-ink-3"> (you)</span>}
            </span>
            <span className="text-[13px] text-ink-3">{member.role === "admin" ? "Admin" : "Member"}</span>
          </span>
        </Link>
        {isAdmin && !lastAdmin && (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setRole(family.id, member.profileId, next);
                setError(result.ok ? undefined : result.error);
              })
            }
            className="h-8 shrink-0 rounded-full border border-line-strong px-3 text-[13px] font-medium hover:bg-hover disabled:opacity-40"
          >
            {next === "admin" ? "Make admin" : "Remove admin"}
          </button>
        )}
      </div>
      <Problem>{error}</Problem>
    </li>
  );
}

function InviteRow({ invite }: { invite: Invite }) {
  const { family, graph } = useFamily();
  const { now, timeZone } = useClock();
  const [link, setLink] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const person = graph.findPerson(invite.profileId);
  const who = person ? fullName(person) : (invite.email ?? "Open invite");

  return (
    <li className={pending ? "opacity-50" : ""}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        {person ? (
          <Avatar personId={person.id} size={40} />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-3">
            <LinkIcon size={18} />
          </span>
        )}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[15px] font-medium">{who}</span>
          <span className="text-[13px] text-ink-3">
            {invite.role === "admin" ? "Admin · " : ""}Sent {relativeTime(invite.createdAt, now, timeZone)}
          </span>
        </span>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resendInvite(family.id, invite.id);
              if (!result.ok) return setError(result.error);
              setError(undefined);
              setLink(`${location.origin}/invite/${result.data}`);
            })
          }
          className="h-8 shrink-0 rounded-full border border-line-strong px-3 text-[13px] font-medium hover:bg-hover"
        >
          New link
        </button>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await revokeInvite(family.id, invite.id);
              setError(result.ok ? undefined : result.error);
            })
          }
          className="h-8 shrink-0 rounded-full px-2 text-[13px] font-medium text-danger hover:bg-hover"
        >
          Cancel
        </button>
      </div>
      {link && (
        <div className="flex items-center gap-2 px-4 pb-3">
          <span className="min-w-0 flex-1 truncate rounded-lg bg-sunken px-3 py-2 text-[13px] text-ink-2">{link}</span>
          <button
            onClick={async () => {
              await navigator.clipboard?.writeText(link);
              setCopied(true);
            }}
            className="h-9 shrink-0 rounded-full bg-ink px-4 text-[13px] font-semibold text-canvas"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <Problem>{error}</Problem>
    </li>
  );
}
