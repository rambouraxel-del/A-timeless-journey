import type { PathKind, PathSegment, Vec2 } from './RoomDefinition';

export interface WalkEdge {
  a: number;
  b: number;
  kind: PathKind;
  length: number;
  dir: Vec2; // unitaire, de a vers b
}

const MERGE_TOLERANCE = 2;

// Transforme les segments d'une salle en graphe : un escalier ou une echelle qui touche
// un sol au milieu le coupe en deux, ce qui cree un embranchement.
export class WalkGraph {
  readonly nodes: Vec2[] = [];
  readonly edges: WalkEdge[] = [];
  private readonly edgesAtNode = new Map<number, number[]>();

  constructor(segments: PathSegment[]) {
    const endpoints = segments.flatMap((s) => [s.from, s.to]);
    for (const seg of segments) {
      const cuts = [0, 1];
      for (const p of endpoints) {
        const t = projectOnSegment(p, seg.from, seg.to);
        if (t > 0 && t < 1 && distance(p, lerp(seg.from, seg.to, t)) <= MERGE_TOLERANCE) cuts.push(t);
      }
      cuts.sort((x, y) => x - y);
      for (let i = 0; i < cuts.length - 1; i++) {
        const p = lerp(seg.from, seg.to, cuts[i]);
        const q = lerp(seg.from, seg.to, cuts[i + 1]);
        if (distance(p, q) > MERGE_TOLERANCE) this.addEdge(this.nodeAt(p), this.nodeAt(q), seg.kind);
      }
    }
  }

  edgesAt(node: number): number[] {
    return this.edgesAtNode.get(node) ?? [];
  }

  pointOn(edgeIndex: number, s: number): Vec2 {
    const e = this.edges[edgeIndex];
    const a = this.nodes[e.a];
    return { x: a.x + e.dir.x * s, y: a.y + e.dir.y * s };
  }

  // Arete la plus proche d'un point (sert a placer le joueur a son arrivee).
  closest(p: Vec2): { edge: number; s: number } {
    let best = { edge: 0, s: 0, d: Infinity };
    this.edges.forEach((e, i) => {
      const a = this.nodes[e.a];
      const b = this.nodes[e.b];
      const t = Math.min(1, Math.max(0, projectOnSegment(p, a, b)));
      const d = distance(p, lerp(a, b, t));
      if (d < best.d) best = { edge: i, s: t * e.length, d };
    });
    return { edge: best.edge, s: best.s };
  }

  private nodeAt(p: Vec2): number {
    const found = this.nodes.findIndex((n) => distance(n, p) <= MERGE_TOLERANCE);
    if (found >= 0) return found;
    this.nodes.push({ x: p.x, y: p.y });
    return this.nodes.length - 1;
  }

  private addEdge(a: number, b: number, kind: PathKind): void {
    const pa = this.nodes[a];
    const pb = this.nodes[b];
    const length = distance(pa, pb);
    const index = this.edges.length;
    this.edges.push({ a, b, kind, length, dir: { x: (pb.x - pa.x) / length, y: (pb.y - pa.y) / length } });
    for (const n of [a, b]) this.edgesAtNode.set(n, [...this.edgesAt(n), index]);
  }
}

function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function projectOnSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
}
