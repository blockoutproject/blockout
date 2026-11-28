import type { UseQueryResult } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react-native";
import { Button } from "./button";
import { useExplicitRead } from "./use-explicit-read";

type ReloadButtonProps = Readonly<
  { disabled?: boolean } & (
    | {
        query: Pick<UseQueryResult, "isFetching" | "refetch">;
        fetching?: never;
        onReload?: never;
      }
    | { query?: never; fetching: boolean; onReload: () => Promise<unknown> }
  )
>;

/** Standard action for rereading confirmed empty content within its existing scope. */
export function ReloadButton(props: ReloadButtonProps) {
  const { query, disabled = false } = props;
  const fetching = query ? query.isFetching : props.fetching;
  // Join a read already in flight instead of replacing it with this gesture.
  const onReload = query
    ? () => query.refetch({ cancelRefetch: false })
    : props.onReload;
  const { requested, progressing, read } = useExplicitRead(onReload, fetching);
  return (
    <Button
      label="Actualiser"
      leadingIcon={RefreshCw}
      onPress={() => void read()}
      loading={progressing}
      disabled={disabled || (requested && !progressing)}
    />
  );
}
