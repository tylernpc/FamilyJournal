"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addRelationship,
  createInvite,
  deletePerson,
  removeRelationship,
  savePerson,
  setPhotoCrops,
  type NewLink,
  type PersonDraft,
} from "@/app/f/[familyId]/actions";
import { age, fullName } from "@/lib/family";
import { useClock, useFamily } from "@/lib/family-context";
import type { MemberRole, Person, Photo, PhotoCrops } from "@/lib/types";
import { cropFor } from "@/lib/photo";
import { readPhoto, uploadPhoto } from "@/lib/upload";
import { Avatar } from "./avatar";
import { CroppedImage, ProfilePhotoCropper } from "./crop-sheet";
import { inputClass } from "./form";
import { CheckIcon, ChevronRightIcon, CloseIcon, LinkIcon, SearchIcon } from "./icons";
import { ConfirmSheet, Sheet, SheetHeader } from "./sheet";

const RELATION_LABEL: Record<NewLink["as"], string> = {
  parent: "parent",
  spouse: "partner",
  child: "child",
};

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[13px] font-semibold">{children}</span>;
}

function ErrorNote({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="rounded-lg bg-sunken px-3.5 py-2.5 text-[14px] text-danger">{children}</p>;
}

// ---------------------------------------------------------------------------
// Add or edit a person. A new person can come with a link to someone already in the tree.

export function PersonSheet({
  person,
  link,
  onClose,
}: {
  person?: Person;
  link?: NewLink;
  onClose: () => void;
}) {
  const { family, graph, me, isAdmin } = useFamily();
  const router = useRouter();
  const [draft, setDraft] = useState<PersonDraft>({
    firstName: person?.firstName ?? "",
    lastName: person?.lastName ?? (link ? graph.getPerson(link.to).lastName : ""),
    maidenName: person?.maidenName ?? "",
    gender: person?.gender ?? "unspecified",
    living: person ? person.lifeStatus === "living" : true,
    birthDate: person?.birthDate ?? "",
    deathDate: person?.deathDate ?? "",
    bio: person?.bio ?? "",
    location: person?.location ?? "",
    photoMediaId: person?.photo?.mediaId ?? null,
  });
  // The picture as it will be once saved: the whole photo plus how it's framed
  const [photo, setPhoto] = useState<Photo | undefined>(person?.photo);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof PersonDraft>(key: K, value: PersonDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const deletable = person?.isPlaceholder && (isAdmin || person.addedBy === me);
  const title = person
    ? person.id === me
      ? "Edit your profile"
      : `Edit ${person.firstName}`
    : link
      ? `Add ${graph.getPerson(link.to).firstName}'s ${RELATION_LABEL[link.as]}`
      : "Add someone";

  // A new photo (with its file) or the current one, while it's being cropped
  const [cropping, setCropping] = useState<{ photo: Photo; file?: File; step?: "circle" | "portrait" }>();

  const pickPhoto = async (file: File) => {
    setError(undefined);
    try {
      setCropping({ photo: await readPhoto(file), file });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const applyCrops = async (crops: PhotoCrops) => {
    const { photo: picked, file } = cropping!;
    setCropping(undefined);
    setError(undefined);
    const before = photo;
    // Show the new framing straight away
    setPhoto({ ...picked, crops });
    setUploading(true);
    try {
      if (file) {
        // The whole photo goes up once, with its crops
        const stored = await uploadPhoto(family.id, file, picked, crops);
        setPhoto({ ...stored, src: picked.src });
        set("photoMediaId", stored.mediaId!);
      } else {
        // Already stored: only the framing changes. Refresh the page if it's the saved picture.
        const saved = picked.mediaId === person?.photo?.mediaId;
        const result = await setPhotoCrops(family.id, picked.mediaId!, crops, saved);
        if (!result.ok) throw new Error(result.error);
      }
    } catch (e) {
      setError((e as Error).message);
      setPhoto(before);
    } finally {
      setUploading(false);
    }
  };

  if (cropping) {
    return (
      <ProfilePhotoCropper
        src={cropping.photo.src}
        initial={cropping.photo.crops}
        initialStep={cropping.step}
        onCancel={() => setCropping(undefined)}
        onDone={applyCrops}
      />
    );
  }

  const save = () =>
    startSaving(async () => {
      const result = await savePerson(family.id, person?.id ?? null, draft, link);
      if (!result.ok) return setError(result.error);
      onClose();
      if (!person) router.push(`/f/${family.id}/people/${result.data}`);
    });

  if (confirmDelete && person) {
    return (
      <ConfirmSheet
        title={`Remove ${person.firstName}?`}
        body="They come out of the tree, and posts stop tagging them. Posts themselves stay."
        confirm={`Remove ${person.firstName}`}
        pending={saving}
        error={error}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          startSaving(async () => {
            const result = await deletePerson(family.id, person.id);
            if (!result.ok) setError(result.error);
          })
        }
      />
    );
  }

  return (
    <Sheet label={title} onClose={onClose}>
      <SheetHeader
        title={title}
        left={
          <button onClick={onClose} className="h-8 text-[15px]">
            Cancel
          </button>
        }
        right={
          <button
            onClick={save}
            disabled={saving || uploading || !draft.firstName.trim()}
            className="h-8 rounded-full bg-ink px-4 text-[14px] font-semibold text-canvas disabled:opacity-25"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        }
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6 pt-4">
        <ErrorNote>{error}</ErrorNote>

        <div className="flex items-center gap-5 pb-2">
          {photo ? (
            // Both ways the photo shows: the tree card, with the profile circle tucked on its corner.
            // Tapping either opens the cropper on that shape.
            <span className={`relative block w-[88px] shrink-0 ${uploading ? "opacity-50" : ""}`}>
              <button
                type="button"
                disabled={!photo.mediaId || uploading}
                onClick={() => setCropping({ photo, step: "portrait" })}
                aria-label="Crop tree card"
                className="block aspect-[10/13] w-full overflow-hidden rounded-[4px] bg-sunken"
              >
                <CroppedImage
                  src={photo.src}
                  rect={cropFor(photo, "portrait")}
                  width={photo.width}
                  height={photo.height}
                  className="h-full w-full"
                />
              </button>
              <button
                type="button"
                disabled={!photo.mediaId || uploading}
                onClick={() => setCropping({ photo, step: "circle" })}
                aria-label="Crop profile circle"
                className="absolute -bottom-2 -right-3 block h-11 w-11 overflow-hidden rounded-full ring-[3px] ring-surface"
              >
                <CroppedImage
                  src={photo.src}
                  rect={cropFor(photo, "avatar")}
                  width={photo.width}
                  height={photo.height}
                  className="h-full w-full"
                />
              </button>
            </span>
          ) : (
            <span className="display flex aspect-[10/13] w-[88px] shrink-0 items-center justify-center rounded-[4px] bg-sunken text-[32px] text-ink-3">
              {draft.firstName[0] ?? "?"}
            </span>
          )}
          <div className="space-y-1.5">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-ink px-4 text-[14px] font-semibold hover:bg-hover">
              {uploading ? "Saving…" : photo ? "Change photo" : "Add photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickPhoto(file);
                  e.target.value = "";
                }}
              />
            </label>
            {photo && !uploading && (
              <div className="flex gap-3 text-[13px] text-ink-3">
                {photo.mediaId && (
                  <button onClick={() => setCropping({ photo })} className="hover:text-ink">
                    Crop
                  </button>
                )}
                <button
                  onClick={() => {
                    setPhoto(undefined);
                    set("photoMediaId", null);
                  }}
                  className="hover:text-ink"
                >
                  Remove photo
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label>First name</Label>
            <input value={draft.firstName} onChange={(e) => set("firstName", e.target.value)} maxLength={100} autoFocus={!person} className={inputClass} />
          </label>
          <label className="block">
            <Label>Last name</Label>
            <input value={draft.lastName} onChange={(e) => set("lastName", e.target.value)} maxLength={100} className={inputClass} />
          </label>
        </div>
        <label className="block">
          <Label>Maiden name</Label>
          <input value={draft.maidenName} onChange={(e) => set("maidenName", e.target.value)} maxLength={100} placeholder="If it changed" className={inputClass} />
        </label>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold">Gender</legend>
          <Segmented
            value={draft.gender}
            onChange={(g) => set("gender", g)}
            options={[
              ["female", "Female"],
              ["male", "Male"],
              ["nonBinary", "Non-binary"],
              ["unspecified", "Not set"],
            ]}
          />
          <p className="mt-1.5 text-[13px] text-ink-3">Only used to word relationships, like grandmother or grandfather.</p>
        </fieldset>

        <label className="block">
          <Label>Born</Label>
          <input type="date" value={draft.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={inputClass} />
        </label>

        {person?.id !== me && (
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold">Living</legend>
            <Segmented
              value={draft.living ? "living" : "deceased"}
              onChange={(v) => set("living", v === "living")}
              options={[
                ["living", "Living"],
                ["deceased", "Passed away"],
              ]}
            />
          </fieldset>
        )}
        {!draft.living && (
          <label className="block">
            <Label>Died</Label>
            <input type="date" value={draft.deathDate} onChange={(e) => set("deathDate", e.target.value)} className={inputClass} />
          </label>
        )}

        <label className="block">
          <Label>Lives in</Label>
          <input value={draft.location} onChange={(e) => set("location", e.target.value)} maxLength={200} placeholder="City, state" className={inputClass} />
        </label>
        <label className="block">
          <Label>About</Label>
          <textarea
            value={draft.bio}
            onChange={(e) => set("bio", e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="A few lines the family would recognize"
            className="w-full resize-none rounded-lg bg-sunken px-3.5 py-2.5 text-[16px] outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink"
          />
        </label>

        {person && <Links person={person} />}

        {deletable && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="h-11 w-full rounded-full text-[15px] font-semibold text-danger hover:bg-hover"
          >
            Remove {person.firstName} from the tree
          </button>
        )}
      </div>
    </Sheet>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`h-9 rounded-full px-3.5 text-[14px] ${
            value === key ? "bg-ink font-semibold text-canvas" : "bg-sunken text-ink-2 hover:bg-hover"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// The person's links in the tree, each removable.
function Links({ person }: { person: Person }) {
  const { family, graph, relationships } = useFamily();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const mine = relationships.filter((r) => r.from === person.id || r.to === person.id);
  if (!mine.length) return null;

  const describe = (r: (typeof mine)[number]) => {
    const other = graph.getPerson(r.from === person.id ? r.to : r.from);
    const role = r.type === "spouseOf" ? "Partner" : r.from === person.id ? "Child" : "Parent";
    return { other, role };
  };

  return (
    <div>
      <Label>In the tree</Label>
      <ul className={`divide-y divide-line rounded-lg border border-line ${pending ? "opacity-50" : ""}`}>
        {mine.map((r) => {
          const { other, role } = describe(r);
          return (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2">
              <Avatar personId={other.id} size={32} />
              <span className="flex-1 text-[14px] leading-tight">
                <span className="block font-medium">{fullName(other)}</span>
                <span className="text-[13px] text-ink-3">{role}</span>
              </span>
              <button
                onClick={() =>
                  startTransition(async () => {
                    const result = await removeRelationship(family.id, r.id);
                    setError(result.ok ? undefined : result.error);
                  })
                }
                aria-label={`Unlink ${other.firstName}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-hover hover:text-ink"
              >
                <CloseIcon size={16} />
              </button>
            </li>
          );
        })}
      </ul>
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add a parent, partner or child: someone new, or someone already in the family.

export function AddRelativeSheet({ personId, onClose }: { personId: string; onClose: () => void }) {
  const { family, graph, people } = useFamily();
  const [as, setAs] = useState<NewLink["as"] | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [since, setSince] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const person = graph.getPerson(personId);

  if (as && creating) return <PersonSheet link={{ to: personId, as }} onClose={onClose} />;

  const already = new Set([personId, ...graph.parentsOf(personId), ...graph.childrenOf(personId)]);
  const spouse = graph.spouseOf(personId);
  if (spouse) already.add(spouse);
  const candidates = people.filter(
    (p) => !already.has(p.id) && fullName(p).toLowerCase().includes(query.trim().toLowerCase()),
  );

  const link = (otherId: string) =>
    startTransition(async () => {
      const [from, to, type] =
        as === "parent"
          ? [otherId, personId, "parentOf" as const]
          : as === "child"
            ? [personId, otherId, "parentOf" as const]
            : [personId, otherId, "spouseOf" as const];
      const result = await addRelationship(family.id, from, to, type, as === "spouse" ? since : undefined);
      if (!result.ok) return setError(result.error);
      onClose();
    });

  return (
    <Sheet label="Add to the tree" onClose={onClose}>
      <SheetHeader
        title={as ? `${person.firstName}'s ${RELATION_LABEL[as]}` : "Add to the tree"}
        left={
          <button onClick={as ? () => setAs(null) : onClose} className="h-8 text-[15px]">
            {as ? "Back" : "Cancel"}
          </button>
        }
      />
      {!as ? (
        <ul className="py-2">
          {(["parent", "spouse", "child"] as const).map((key) => (
            <li key={key}>
              <button
                onClick={() => setAs(key)}
                className="flex h-13 w-full items-center gap-3 px-4 text-left text-[16px] hover:bg-hover"
              >
                <span className="flex-1">Add a {RELATION_LABEL[key]}</span>
                <ChevronRightIcon size={18} className="text-ink-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 px-4 pt-4">
            <button
              onClick={() => setCreating(true)}
              className="h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-canvas hover:bg-accent-hover"
            >
              Someone new
            </button>
            {as === "spouse" && (
              <label className="block">
                <Label>Married (optional)</Label>
                <input type="date" value={since} onChange={(e) => setSince(e.target.value)} className={inputClass} />
              </label>
            )}
            <ErrorNote>{error}</ErrorNote>
            <p className="pt-2 text-[13px] font-semibold">Or someone already here</p>
            <label className="flex h-10 items-center gap-2 rounded-full bg-sunken px-3.5">
              <SearchIcon size={16} className="text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search family"
                className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
              />
            </label>
          </div>
          <ul className={`min-h-0 flex-1 overflow-y-auto py-2 ${pending ? "opacity-50" : ""}`}>
            {candidates.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => link(p.id)}
                  disabled={pending}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-hover"
                >
                  <Avatar personId={p.id} size={40} />
                  <span className="flex-1 text-[15px] font-medium">{fullName(p)}</span>
                </button>
              </li>
            ))}
            {candidates.length === 0 && (
              <li className="px-4 py-6 text-center text-[14px] text-ink-3">No one else to link.</li>
            )}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Invite someone: makes a one-time link to share by text or email.

export function InviteSheet({ profileId, onClose }: { profileId?: string; onClose: () => void }) {
  const { family, people, isAdmin, graph } = useFamily();
  const { now } = useClock();
  const [email, setEmail] = useState("");
  const [claim, setClaim] = useState(profileId ?? "");
  const [role, setRole] = useState<MemberRole>("member");
  const [link, setLink] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // Placeholders someone could claim: living, and old enough for their own account
  const claimable = people.filter(
    (p) => p.isPlaceholder && p.lifeStatus === "living" && (age(p, now) ?? 99) >= 13,
  );
  const invitee = graph.findPerson(claim);

  const create = () =>
    startTransition(async () => {
      const result = await createInvite(family.id, { email, profileId: claim || null, role });
      if (!result.ok) return setError(result.error);
      setError(undefined);
      setLink(`${location.origin}/invite/${result.data}`);
    });

  const share = async () => {
    if (!link) return;
    const text = `Join ${family.name} on Family Journal`;
    if (navigator.share) {
      await navigator.share({ title: text, text, url: link }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(link);
      setCopied(true);
    }
  };

  return (
    <Sheet label="Invite family" onClose={onClose}>
      <SheetHeader
        title="Invite family"
        left={
          <button onClick={onClose} className="h-8 text-[15px]">
            {link ? "Done" : "Cancel"}
          </button>
        }
      />
      {link ? (
        <div className="px-5 pb-6 pt-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink text-canvas">
            <CheckIcon size={22} strokeWidth={2} />
          </span>
          <p className="display mt-4 text-[26px]">Invite ready</p>
          <p className="mx-auto mt-2 max-w-[320px] text-[15px] text-ink-2">
            Send this link to {invitee ? invitee.firstName : email || "them"}. It works once and lasts two weeks.
          </p>
          <p className="mt-5 break-all rounded-lg bg-sunken px-3.5 py-3 text-left text-[13px] text-ink-2">{link}</p>
          <button
            onClick={share}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-canvas hover:bg-accent-hover"
          >
            {copied ? <CheckIcon size={18} strokeWidth={2} /> : <LinkIcon size={18} />}
            {copied ? "Link copied" : "Share link"}
          </button>
          <button
            onClick={async () => {
              await navigator.clipboard?.writeText(link);
              setCopied(true);
            }}
            className="mt-2 h-11 w-full rounded-full text-[15px] font-semibold hover:bg-hover"
          >
            Copy link
          </button>
        </div>
      ) : (
        <form
          className="space-y-5 overflow-y-auto px-4 pb-6 pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <label className="block">
            <Label>Their email (optional)</Label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="june@example.com"
              className={inputClass}
            />
            <span className="mt-1.5 block text-[13px] text-ink-3">
              For your records. You&apos;ll get a link to send them yourself.
            </span>
          </label>

          {claimable.length > 0 && (
            <fieldset>
              <legend className="text-[14px] font-semibold">Already in the tree?</legend>
              <p className="mt-0.5 text-[13px] text-ink-3">Linking keeps every post they&apos;ve been tagged in.</p>
              <div className="mt-2 divide-y divide-line rounded-lg border border-line">
                {[{ id: "", label: "No, they'll start a new profile" }, ...claimable.map((p) => ({ id: p.id, label: `Yes, they're ${fullName(p)}` }))].map(
                  (opt) => (
                    <label key={opt.id || "new"} className="flex h-12 cursor-pointer items-center gap-3 px-3.5 text-[15px]">
                      <input
                        type="radio"
                        name="claim"
                        checked={claim === opt.id}
                        onChange={() => setClaim(opt.id)}
                        className="h-4 w-4 accent-[var(--ink)]"
                      />
                      {opt.label}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
          )}

          {isAdmin && (
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-[14px] font-semibold">Make them an admin</span>
                <span className="block text-[13px] text-ink-3">Admins can rename the family and manage members.</span>
              </span>
              <input
                type="checkbox"
                checked={role === "admin"}
                onChange={(e) => setRole(e.target.checked ? "admin" : "member")}
                className="h-5 w-5 accent-[var(--ink)]"
              />
            </label>
          )}

          <ErrorNote>{error}</ErrorNote>
          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-canvas disabled:opacity-40"
          >
            {pending ? "Making a link…" : "Create invite link"}
          </button>
        </form>
      )}
    </Sheet>
  );
}
