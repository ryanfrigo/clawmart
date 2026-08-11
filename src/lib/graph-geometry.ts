/**
 * Deterministic DAG layout for mission plans and the founding-team figure.
 *
 * Why this is a shared module and not a component detail: the live mission
 * graph (components/studio/mission-graph.tsx) and the static founding-team
 * figure (components/site/pipeline-figure.tsx) must be geometrically identical
 * — one visual language, one set of constants — without either owning the
 * other's component.
 *
 * There is no physics and no library here on purpose. `validatePlan` in
 * convex/lib/roster.ts guarantees edges point strictly backwards (a task may
 * only depend on a lower index), so depth resolves in a single forward pass and
 * always terminates. A graph you cannot reproduce is a toy, not telemetry.
 *
 * COLUMN = WAVE = THE SCHEDULER. `claimReadyTasks` (convex/missions.ts) runs
 * every task whose dependencies are satisfied, up to MAX_CONCURRENT_TASKS, so a
 * column is not decoration: it is the set of specialists that actually execute
 * together.
 */

export const NODE_W = 216;
export const NODE_H = 72;
export const COL_GUTTER = 72;
export const ROW_GUTTER = 24;
export const PAD_X = 24;
export const PAD_Y = 20;

/** Centre-to-centre spacing along each axis. */
export const COL_PITCH = NODE_W + COL_GUTTER; // 288
export const ROW_PITCH = NODE_H + ROW_GUTTER; // 96

/** The canvas never collapses below this, so an empty plan still reads as a stage. */
export const MIN_STAGE_H = 260;

/** The minimum a task needs to be placed. Anything else rides along untouched. */
export interface GraphTask {
  index: number;
  dependsOn: number[];
}

export interface PlacedNode<T extends GraphTask> {
  task: T;
  index: number;
  /** Wave — 0 for tasks with no dependencies. */
  depth: number;
  /** Position within the wave, ordered by task index. */
  row: number;
  x: number;
  y: number;
}

export interface GraphLayout<T extends GraphTask> {
  nodes: PlacedNode<T>[];
  /** Task indices grouped by wave, in wave order. */
  waves: number[][];
  byIndex: Map<number, PlacedNode<T>>;
  width: number;
  height: number;
  /** Number of waves — `waves.length`, hoisted for readability at call sites. */
  depthCount: number;
  transposed: boolean;
}

/**
 * depth(i) = dependsOn.length ? 1 + max(depth(d)) : 0
 *
 * Single forward pass over index order. A dependency on an unknown index (a
 * plan row deleted out from under us) is ignored rather than throwing — the
 * board must still render.
 */
export function depthOf<T extends GraphTask>(tasks: readonly T[]): Map<number, number> {
  const depth = new Map<number, number>();
  const ordered = [...tasks].sort((a, b) => a.index - b.index);
  for (const t of ordered) {
    let d = 0;
    for (const dep of t.dependsOn) {
      const parent = depth.get(dep);
      if (parent !== undefined) d = Math.max(d, parent + 1);
    }
    depth.set(t.index, d);
  }
  return depth;
}

/**
 * Place every task on the stage.
 *
 * `transpose` swaps the axes for narrow viewports: depth runs top-to-bottom and
 * siblings sit side by side. A horizontally scrolling DAG on a phone is
 * unusable, and collapsing back to a list throws away the dependency structure
 * that is the whole point.
 */
export function layout<T extends GraphTask>(
  tasks: readonly T[],
  opts: { transpose?: boolean } = {}
): GraphLayout<T> {
  const transposed = opts.transpose === true;
  const depth = depthOf(tasks);
  const ordered = [...tasks].sort((a, b) => a.index - b.index);

  const waveOf = new Map<number, number[]>();
  for (const t of ordered) {
    const d = depth.get(t.index) ?? 0;
    const bucket = waveOf.get(d);
    if (bucket) bucket.push(t.index);
    else waveOf.set(d, [t.index]);
  }

  const depthCount = waveOf.size === 0 ? 0 : Math.max(...waveOf.keys()) + 1;
  const waves: number[][] = [];
  for (let d = 0; d < depthCount; d++) waves.push(waveOf.get(d) ?? []);

  const widest = waves.reduce((max, w) => Math.max(max, w.length), 0);

  const nodes: PlacedNode<T>[] = ordered.map((task) => {
    const d = depth.get(task.index) ?? 0;
    const row = (waveOf.get(d) ?? []).indexOf(task.index);
    return {
      task,
      index: task.index,
      depth: d,
      row,
      x: PAD_X + (transposed ? row : d) * COL_PITCH,
      y: PAD_Y + (transposed ? d : row) * ROW_PITCH,
    };
  });

  const cols = transposed ? widest : depthCount;
  const rows = transposed ? depthCount : widest;

  const width = cols === 0 ? PAD_X * 2 + NODE_W : PAD_X * 2 + cols * COL_PITCH - COL_GUTTER;
  const naturalHeight =
    rows === 0 ? PAD_Y * 2 + NODE_H : PAD_Y * 2 + rows * ROW_PITCH - ROW_GUTTER;

  const byIndex = new Map<number, PlacedNode<T>>();
  for (const n of nodes) byIndex.set(n.index, n);

  return {
    nodes,
    waves,
    byIndex,
    width,
    // Computed from the widest wave, never fixed — but the stage keeps its
    // presence when a plan is one flat column.
    height: transposed ? naturalHeight : Math.max(naturalHeight, MIN_STAGE_H),
    depthCount,
    transposed,
  };
}

/**
 * Manhattan route from one node to another: out of the source edge, down a
 * vertical channel in the gutter, into the target edge. Orthogonal on purpose —
 * a bézier reads as org-chart whimsy, a right angle reads as conduit.
 *
 * Returns an SVG path plus the chevron anchor, so the caller does not need to
 * re-derive where the arrowhead lands.
 */
export function edgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  transposed: boolean
): { d: string; tipX: number; tipY: number; angle: number } {
  const ELBOW = 6;
  const STUB = 24;

  if (transposed) {
    // Vertical flow: out of the bottom, across a horizontal channel, into the top.
    const sx = from.x + NODE_W / 2;
    const sy = from.y + NODE_H;
    const tx = to.x + NODE_W / 2;
    const ty = to.y;
    const midY = sy + Math.max(ELBOW, (ty - sy) / 2);
    const d =
      sx === tx
        ? `M ${sx} ${sy} L ${tx} ${ty}`
        : `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
    return { d, tipX: tx, tipY: ty, angle: 90 };
  }

  // Horizontal flow: out of the right edge, down a vertical channel, into the left.
  const sx = from.x + NODE_W;
  const sy = from.y + NODE_H / 2;
  const tx = to.x;
  const ty = to.y + NODE_H / 2;
  const channelX = Math.max(sx + STUB, tx - STUB);
  const d =
    sy === ty
      ? `M ${sx} ${sy} L ${tx} ${ty}`
      : `M ${sx} ${sy} L ${channelX} ${sy} L ${channelX} ${ty} L ${tx} ${ty}`;
  return { d, tipX: tx, tipY: ty, angle: 0 };
}
