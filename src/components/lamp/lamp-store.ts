// Tiny external store that the physics lamp writes the live bob position to,
// and the pretext text-wrapper reads from. Kept out of React state on purpose:
// the bob updates ~60fps and we don't want to trigger re-renders for it.

export type BobState = {
  /** viewport x of the bob center, in CSS pixels */
  x: number;
  /** viewport y of the bob center, in CSS pixels */
  y: number;
  /** bob radius in CSS pixels */
  r: number;
  /** whether the lamp is currently being interacted with (drag/throw) */
  active: boolean;
};

const state: BobState = { x: -9999, y: -9999, r: 0, active: false };
const listeners = new Set<() => void>();

export function setBob(next: Partial<BobState>) {
  Object.assign(state, next);
  listeners.forEach((l) => l());
}

export function getBob(): Readonly<BobState> {
  return state;
}

export function subscribeBob(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
