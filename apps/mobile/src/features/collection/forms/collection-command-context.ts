import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";

/** Local command feedback survives temporary route removal; remote state remains exclusively Query-owned. */
interface CommandState {
  needsRead: boolean;
  feedback?: string;
}
/** One selected control's reconciliation requirement, bounded to the current F05 session. */
interface CommandContext {
  generation: string;
  controlId: string;
  /** Returns stable metadata for React's native external-store subscription. */
  getSnapshot(): CommandState;
  /** Observes command feedback without copying the remote control. */
  subscribe(listener: () => void): () => void;
  /** Records an attempted command or an explicit current-state reread. */
  update(state: CommandState): void;
  /** Detaches the owning session observer. */
  release(): void;
}
let current: CommandContext | undefined;

/** Retains only the selected scope's command reconciliation, with no replay, persistence or execution history. */
export function collectionCommandContext(
  session: SessionSnapshot & Pick<SessionGeneration, "isCurrent" | "subscribe">,
  controlId: string,
): CommandContext {
  if (
    current?.generation === session.generation &&
    current.controlId === controlId
  )
    return current;
  current?.release();
  let state: CommandState = { needsRead: false };
  const listeners = new Set<() => void>();
  const context: CommandContext = {
    generation: session.generation,
    controlId,
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
    release: session.subscribe(() => {
      if (!session.isCurrent(context.generation)) {
        context.release();
        if (current === context) current = undefined;
      }
    }),
  };
  current = context;
  return context;
}
