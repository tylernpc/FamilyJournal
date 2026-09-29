import type { FamilyGraph } from "./family";

// Derives a generational layout from relationship data alone — nobody places nodes by hand.
// Each "unit" is a person plus their spouse; children hang off the couple.

// Portrait cards: photo on top, name and relation underneath.
export const NODE_W = 200;
export const PHOTO_H = 260;
export const NODE_H = PHOTO_H + 50;
const COUPLE_GAP = 12;
const SIBLING_GAP = 28;
const ROW_GAP = 64;
const PADDING = 32;

type Unit = { members: string[]; children: Unit[] };

export type NodeBox = { id: string; x: number; y: number; generation: number };

export type Connector =
  | { kind: "couple"; x1: number; x2: number; y: number }
  | { kind: "family"; fromX: number; fromY: number; busY: number; childXs: number[]; childY: number };

export type TreeLayout = {
  nodes: Map<string, NodeBox>;
  connectors: Connector[];
  width: number;
  height: number;
  generations: number;
};

function buildUnit(graph: FamilyGraph, id: string, seen: Set<string>): Unit {
  const spouse = graph.spouseOf(id);
  const members = spouse && !seen.has(spouse) ? [id, spouse] : [id];
  members.forEach((m) => seen.add(m));

  const kids = new Set<string>();
  for (const m of members) graph.childrenOf(m).forEach((c) => kids.add(c));
  const birthOrder = (child: string) => {
    const born = graph.findPerson(child)?.birthDate;
    return born ? new Date(born).getTime() : 0;
  };
  const ordered = [...kids].sort((a, b) => birthOrder(a) - birthOrder(b));

  return {
    members,
    children: ordered.filter((c) => !seen.has(c)).map((c) => buildUnit(graph, c, seen)),
  };
}

function unitWidth(u: Unit) {
  return u.members.length * NODE_W + (u.members.length - 1) * COUPLE_GAP;
}

function subtreeWidth(u: Unit): number {
  const own = unitWidth(u);
  if (!u.children.length) return own;
  const kids =
    u.children.reduce((sum, c) => sum + subtreeWidth(c), 0) +
    SIBLING_GAP * (u.children.length - 1);
  return Math.max(own, kids);
}

export function layoutTree(graph: FamilyGraph): TreeLayout {
  const seen = new Set<string>();
  const roots: Unit[] = [];
  for (const p of graph.people) {
    if (seen.has(p.id)) continue;
    const spouse = graph.spouseOf(p.id);
    const isRoot =
      graph.parentsOf(p.id).length === 0 && (!spouse || graph.parentsOf(spouse).length === 0);
    if (isRoot) roots.push(buildUnit(graph, p.id, seen));
  }
  // Anyone the walk above didn't reach still gets a place, at the end.
  for (const p of graph.people) if (!seen.has(p.id)) roots.push(buildUnit(graph, p.id, seen));

  const nodes = new Map<string, NodeBox>();
  const connectors: Connector[] = [];
  let maxGen = 0;

  const rowY = (gen: number) => PADDING + gen * (NODE_H + ROW_GAP);

  function place(u: Unit, left: number, gen: number) {
    maxGen = Math.max(maxGen, gen);
    const total = subtreeWidth(u);
    const own = unitWidth(u);

    // Lay children out first so the couple can center over them.
    const childBoxes: { unit: Unit; left: number }[] = [];
    if (u.children.length) {
      const kidsWidth =
        u.children.reduce((s, c) => s + subtreeWidth(c), 0) +
        SIBLING_GAP * (u.children.length - 1);
      let cursor = left + (total - kidsWidth) / 2;
      for (const child of u.children) {
        childBoxes.push({ unit: child, left: cursor });
        place(child, cursor, gen + 1);
        cursor += subtreeWidth(child) + SIBLING_GAP;
      }
    }

    let unitLeft = left + (total - own) / 2;
    if (childBoxes.length) {
      const first = nodes.get(childBoxes[0].unit.members[0])!;
      const last = nodes.get(childBoxes[childBoxes.length - 1].unit.members[0])!;
      const center = (first.x + last.x + NODE_W) / 2;
      unitLeft = Math.min(Math.max(center - own / 2, left), left + total - own);
    }

    const y = rowY(gen);
    u.members.forEach((id, i) => {
      nodes.set(id, { id, x: unitLeft + i * (NODE_W + COUPLE_GAP), y, generation: gen });
    });

    if (u.members.length === 2) {
      connectors.push({
        kind: "couple",
        x1: unitLeft + NODE_W,
        x2: unitLeft + NODE_W + COUPLE_GAP,
        y: y + PHOTO_H / 2,
      });
    }

    if (childBoxes.length) {
      const fromX = unitLeft + own / 2;
      const childY = rowY(gen + 1);
      connectors.push({
        kind: "family",
        fromX,
        fromY: u.members.length === 2 ? y + PHOTO_H / 2 : y + NODE_H,
        busY: childY - ROW_GAP / 2,
        childXs: childBoxes.map((c) => nodes.get(c.unit.members[0])!.x + NODE_W / 2),
        childY,
      });
    }
  }

  let cursor = PADDING;
  for (const root of roots) {
    place(root, cursor, 0);
    cursor += subtreeWidth(root) + SIBLING_GAP * 2;
  }

  return {
    nodes,
    connectors,
    width: cursor - SIBLING_GAP * 2 + PADDING,
    height: rowY(maxGen) + NODE_H + PADDING,
    generations: maxGen + 1,
  };
}
