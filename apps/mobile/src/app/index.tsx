import { Redirect } from "expo-router";
import { useAccountSession } from "@/features/accounts/current-account";
import { homeHref } from "@/shared/native/home-href";
import { ApiError } from "@/shared/api/api-fetch";

/** Selects the first real destination; explicit guest navigation opens Home directly. */
export default function EntryRoute() {
  const session = useAccountSession();
  const connection = session.connection;
  const connectionFailed =
    connection.isError &&
    !(
      connection.error instanceof ApiError &&
      connection.error.kind === "cancelled"
    );
  return (
    <Redirect
      href={
        session.subject && !connection.isPending && !connectionFailed
          ? homeHref
          : "/sign-in"
      }
    />
  );
}
