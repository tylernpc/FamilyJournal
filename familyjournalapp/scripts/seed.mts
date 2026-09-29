// Loads the Harlow family demo into a running API: accounts for everyone who has joined, the tree,
// profile photos, posts, reactions and comments. Photos come from Unsplash, so it needs internet.
//
//   node scripts/seed.mts                      (API at http://localhost:5092)
//   API_URL=http://localhost:5199 node scripts/seed.mts
//
// Everything goes through the public API, so it behaves exactly like people using the app.
// Posts get today's timestamps, in the original order. Run it once per database.

import { CURRENT_USER_ID, family, initialPosts, people, relationships } from "./seed-data.ts";

const API = process.env.API_URL ?? "http://localhost:5092";

// Demo accounts only: sign in as emma@harlow.example.com with this password.
const PASSWORD = "harlow-family-demo";
const emailFor = (seedId: string) => `${seedId}@harlow.example.com`;

type Json = Record<string, unknown>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call<T = Json>(
  method: string,
  path: string,
  options: { token?: string; json?: unknown; form?: FormData; allow?: number[] } = {},
): Promise<{ status: number; body: T }> {
  for (;;) {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.json !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.form ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
    });
    // Sign-up and invite links are rate limited per address; wait out the window.
    if (response.status === 429) {
      console.log("  (rate limited, waiting a minute)");
      await sleep(61_000);
      continue;
    }
    const text = await response.text();
    if (!response.ok && !options.allow?.includes(response.status)) {
      throw new Error(`${method} ${path} → ${response.status}\n${text}`);
    }
    return { status: response.status, body: (text ? JSON.parse(text) : undefined) as T };
  }
}

async function uploadFromUrl(token: string, familyId: string, url: string, width: number, height: number) {
  const image = await fetch(url);
  if (!image.ok) throw new Error(`Couldn't download ${url}: ${image.status}`);
  const type = image.headers.get("content-type") ?? "image/jpeg";
  const form = new FormData();
  form.append("file", new Blob([await image.arrayBuffer()], { type }), "photo.jpg");
  form.append("width", String(width));
  form.append("height", String(height));
  const { body } = await call<{ id: string }>("POST", `/api/families/${familyId}/media`, { token, form });
  return body.id;
}

const portraitUrl = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?w=600&h=780&fit=crop&crop=faces&q=80`;

async function main() {
  console.log(`Seeding ${family.name} into ${API}`);
  const emma = people.find((p) => p.id === CURRENT_USER_ID)!;

  const register = async (seedId: string) => {
    const person = people.find((p) => p.id === seedId)!;
    return call<{ accessToken: string }>("POST", "/api/auth/register", {
      json: { email: emailFor(seedId), password: PASSWORD, firstName: person.firstName, lastName: person.lastName },
      allow: [409],
    });
  };

  const first = await register(emma.id);
  if (first.status === 409) {
    console.log(`Already seeded: ${emailFor(emma.id)} exists. Nothing to do.`);
    return;
  }

  const tokens = new Map<string, string>([[emma.id, first.body.accessToken]]);
  const emmaToken = first.body.accessToken;

  const { body: created } = await call<{ id: string; members: { profileId: string }[] }>("POST", "/api/families", {
    token: emmaToken,
    json: { name: family.name },
  });
  const familyId = created.id;
  const base = `/api/families/${familyId}`;
  const ids = new Map<string, string>([[emma.id, created.members[0].profileId]]);

  // Everyone in the tree, with their portraits. Emma's profile already exists; the rest start as
  // placeholders, and the ones who "joined" claim theirs through an invite below.
  console.log("Adding people…");
  for (const person of people) {
    const photoMediaId = person.photo
      ? await uploadFromUrl(emmaToken, familyId, portraitUrl(person.photo), 600, 780)
      : null;
    const profile = {
      firstName: person.firstName,
      lastName: person.lastName,
      maidenName: person.maidenName ?? null,
      gender: person.sex === "f" ? "Female" : person.sex === "m" ? "Male" : "Unspecified",
      lifeStatus: person.lifeStatus === "deceased" ? "Deceased" : "Living",
      birthDate: person.birthDate ?? null,
      deathDate: person.deathDate ?? null,
      bio: person.bio ?? null,
      location: person.location ?? null,
      photoMediaId,
    };
    if (person.id === emma.id) {
      await call("PUT", `${base}/people/${ids.get(emma.id)}`, { token: emmaToken, json: profile });
    } else {
      const { body } = await call<{ id: string }>("POST", `${base}/people`, { token: emmaToken, json: profile });
      ids.set(person.id, body.id);
    }
    console.log(`  ${person.firstName} ${person.lastName}`);
  }

  console.log("Linking the tree…");
  for (const r of relationships) {
    await call("POST", `${base}/relationships`, {
      token: emmaToken,
      json: {
        fromProfileId: ids.get(r.from),
        toProfileId: ids.get(r.to),
        type: r.type === "spouseOf" ? "SpouseOf" : "ParentOf",
        since: r.since ?? null,
      },
    });
  }

  console.log("Inviting and signing up the family…");
  for (const person of people) {
    if (person.id === emma.id) continue;
    const joins = !person.isPlaceholder;
    if (!joins && !person.inviteSentAt) continue;

    const { body: invite } = await call<{ token: string }>("POST", `${base}/invites`, {
      token: emmaToken,
      json: { email: emailFor(person.id), profileId: ids.get(person.id), role: "Member" },
    });
    if (!joins) {
      console.log(`  ${person.firstName} (invited, hasn't joined)`);
      continue;
    }
    const { body: account } = await register(person.id);
    await call("POST", `/api/invites/${invite.token}/accept`, { token: account.accessToken, json: {} });
    tokens.set(person.id, account.accessToken);
    if (person.role === "admin") {
      await call("PUT", `${base}/members/${ids.get(person.id)}/role`, { token: emmaToken, json: { role: "Admin" } });
    }
    console.log(`  ${person.firstName} joined`);
  }

  const fullNames = people.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` }));
  const mentions = (text: string) =>
    fullNames.filter((n) => text.includes(`@${n.name}`) && tokens.has(n.id)).map((n) => ids.get(n.id));

  console.log("Posting…");
  const posts = [...initialPosts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const post of posts) {
    // Posts by people without accounts go up as Emma's
    const author = tokens.has(post.authorId) ? post.authorId : emma.id;
    const token = tokens.get(author)!;
    const photos = [];
    for (const photo of post.photos ?? []) {
      photos.push({
        mediaId: await uploadFromUrl(token, familyId, photo.src, photo.width, photo.height),
        altText: photo.alt,
      });
    }
    const { body: saved } = await call<{ id: string }>("POST", `${base}/posts`, {
      token,
      json: {
        text: post.text,
        taggedProfileIds: post.tagged.map((t) => ids.get(t)).filter(Boolean),
        photos,
        lifeEvent: post.lifeEvent
          ? { type: post.lifeEvent.type, label: post.lifeEvent.label ?? null, title: post.lifeEvent.title, date: post.lifeEvent.date }
          : null,
      },
    });

    for (const reaction of post.reactions) {
      const reactor = tokens.get(reaction.personId);
      if (!reactor) continue;
      await call("PUT", `${base}/posts/${saved.id}/reaction`, { token: reactor, json: { emoji: reaction.emoji } });
    }
    for (const comment of post.comments) {
      const commenter = tokens.get(comment.authorId);
      if (!commenter) continue;
      await call("POST", `${base}/posts/${saved.id}/comments`, {
        token: commenter,
        json: { text: comment.text, mentionedProfileIds: mentions(comment.text) },
      });
    }
    console.log(`  ${post.lifeEvent?.title ?? post.text.slice(0, 60)}`);
  }

  console.log(`\nDone. Sign in as ${emailFor(emma.id)} (password in scripts/seed.mts).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
