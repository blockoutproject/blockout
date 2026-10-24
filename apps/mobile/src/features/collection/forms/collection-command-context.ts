import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";

/** Local command feedback survives temporary route removal; remote state remains exclusively Query-owned. */
interface CommandState {
  needsRead: boolean;
  feedback?: string;
}
/** Reconciliation survives navigation and draft discard independently of Query's request lifecycle. */
interface CommandContext {
  /** Returns stable metadata for React's native external-store subscription. */
  getSnapshot(): CommandState;
  /** Observes command feedback without copying the remote control. */
  subscribe(listener: () => void): () => void;
  /** Records an attempted command or an explicit current-state reread. */
  update(state: CommandState): void;
}
/** At most one metadata entry per visited control or season closure; F05 releases the complete session. */
interface CommandSession {
  generation: string;
  targets: Map<string, CommandContext>;
  /** Detaches the single session lifetime observer. */
  release(): void;
}
let current: CommandSession | undefined;

/** Retains one command target's reconciliation until explicit reread, without remote values or execution history. */
export function collectionCommandContext(
  session: SessionSnapshot & Pick<SessionGeneration, "isCurrent" | "subscribe">,
  targetKey: string,
): CommandContext {
  if (current?.generation !== session.generation) {
    current?.release();
    const owner: CommandSession = {
      generation: session.generation,
      targets: new Map(),
      release: session.subscribe(() => {
        if (!session.isCurrent(owner.generation)) {
          owner.release();
          owner.targets.clear();
          if (current === owner) current = undefined;
        }
      }),
    };
    current = owner;
  }
  const existing = current.targets.get(targetKey);
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
  current.targets.set(targetKey, context);
  return context;
}
