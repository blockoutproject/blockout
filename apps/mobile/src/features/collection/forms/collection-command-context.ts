import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";

/** Local command feedback survives temporary route removal; remote state remains exclusively Query-owned. */
interface CommandState {
  needsRead: boolean;
  feedback?: string;
}
/** A control's reconciliation requirement survives navigation to another control in the same session. */
interface CommandContext {
  /** Returns stable metadata for React's native external-store subscription. */
  getSnapshot(): CommandState;
  /** Observes command feedback without copying the remote control. */
  subscribe(listener: () => void): () => void;
  /** Records an attempted command or an explicit current-state reread. */
  update(state: CommandState): void;
}
/** At most one metadata entry per visited control; F05 invalidation releases the complete session. */
interface CommandSession {
  generation: string;
  controls: Map<string, CommandContext>;
  /** Detaches the single session lifetime observer. */
  release(): void;
}
let current: CommandSession | undefined;

/** Retains per-control reconciliation until explicit reread, with no remote values, replay or execution history. */
export function collectionCommandContext(
  session: SessionSnapshot & Pick<SessionGeneration, "isCurrent" | "subscribe">,
  controlId: string,
): CommandContext {
  if (current?.generation !== session.generation) {
    current?.release();
    const owner: CommandSession = {
      generation: session.generation,
      controls: new Map(),
      release: session.subscribe(() => {
        if (!session.isCurrent(owner.generation)) {
          owner.release();
          owner.controls.clear();
          if (current === owner) current = undefined;
        }
      }),
    };
    current = owner;
  }
  const existing = current.controls.get(controlId);
  if (existing) return existing;
  let state: CommandState = { needsRead: false };
  const listeners = new Set<() => void>();
  const context: CommandContext = {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
  };
  current.controls.set(controlId, context);
  return context;
}
